var myId=0;

var land;

var shadow;
var tank;
var turret;
var player;
var tanksList;
var explosions;

var logo;


var cursors;

var bullets;
var fireRate = 100;
var nextFire = 0;

var ready = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();

	eurecaClient.ready(function (proxy) {
		eurecaServer = proxy;
	});


	//methods defined under "exports" namespace become available in the server side

	eurecaClient.exports.setId = function(id)
	{
		//create() is moved here to make sure nothing is created before uniq id assignation
		myId = id;
		create();
		eurecaServer.handshake();
		ready = true;
	}

	eurecaClient.exports.kill = function(id)
	{
		if (tanksList[id]) {
			tanksList[id].kill();
			console.log('killing ', id, tanksList[id]);
		}
	}

	eurecaClient.exports.spawnEnemy = function(i, x, y)
	{

		if (i == myId) return; //this is me

		console.log('SPAWN');
		var tnk = new Tank(i, game, tank);
        game.physics.enable(tnk, Phaser.Physics.ARCADE);
        tnk.tank.body.immovable = true;
        tnk.tank.body.collideWorldBounds = true;
		tanksList[i] = tnk;
	}

	eurecaClient.exports.updateState = function(id, state)
	{
		if (tanksList[id])  {
			tanksList[id].cursor = state;
			tanksList[id].tank.x = state.x;
			tanksList[id].tank.y = state.y;
			tanksList[id].tank.angle = state.angle;
			tanksList[id].update();
		}
	}
}


Tank = function (index, game, player) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
	}

	this.input = {
		left:false,
		right:false,
		up:false
	}

    var x = 0;
    var y = 0;

    this.game = game;
    this.player = player;

	this.currentSpeed =0;
    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'shadow');
    this.tank = game.add.sprite(x, y, 'enemy');

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);

    this.tank.id = index;
    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.tank.body.immovable = true;
    this.tank.body.collideWorldBounds = true;
    this.tank.body.bounce.setTo(0, 0);

    this.tank.angle = 0;

    game.physics.arcade.velocityFromRotation(this.tank.rotation, 0, this.tank.body.velocity);

};

Tank.prototype.update = function() {

	var inputChanged = (
		this.cursor.left != this.input.left ||
		this.cursor.right != this.input.right ||
		this.cursor.up != this.input.up
	);

	if (inputChanged)
	{
		//Handle input change here
		//send new values to the server
		if (this.tank.id == myId)
		{
			// send latest valid state to the server
			this.input.x = this.tank.x;
			this.input.y = this.tank.y;
			this.input.angle = this.tank.angle;

			eurecaServer.handleKeys(this.input);
		}
	}

	//cursor value is now updated by eurecaClient.exports.updateState method

    if (this.input.left)
    {
        this.tank.angle -= 3;
    }
    else if (this.input.right)
    {
        this.tank.angle += 3;
    }
    if (this.input.up)
    {
        //  The speed we'll travel at
        this.currentSpeed = 300;
    }
    else
    {
        if (this.currentSpeed > 0)
        {
            this.currentSpeed -= 4;
        }
    }
    if (this.currentSpeed > 0)
    {
        game.physics.arcade.velocityFromRotation(this.tank.rotation, this.currentSpeed, this.tank.body.velocity);
    }
	else
	{
		game.physics.arcade.velocityFromRotation(this.tank.rotation, 0, this.tank.body.velocity);
	}

    this.shadow.x = this.tank.x;
    this.shadow.y = this.tank.y;
    this.shadow.rotation = this.tank.rotation;
};

Tank.prototype.kill = function() {
	this.alive = false;
	this.tank.kill();
	this.shadow.kill();
}

var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {
    //game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    //game.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
    game.load.image('enemy', 'assets/bluecar.png');
    game.load.image('shadow', 'assets/shadow.png')
    game.load.image('logo', 'assets/logo.png');
    game.load.image('earth', 'assets/light_grass.png');
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
}

function create () {

    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);
	game.stage.disableVisibilityChange  = true;

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 800, 600, 'earth');
    land.fixedToCamera = true;

    game.physics.startSystem(Phaser.Physics.ARCADE);

    tanksList = {};

	player = new Tank(myId, game, tank);
	tanksList[myId] = player;
	tank = player.tank;
	tank.x=0;
	tank.y=0;
	shadow = player.shadow;

    tank.bringToTop();

    logo = game.add.sprite(0, 200, 'logo');
    logo.fixedToCamera = true;

    game.input.onDown.add(removeLogo, this);

    game.camera.follow(tank);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

	setTimeout(removeLogo, 1000);
}

function removeLogo () {
    game.input.onDown.remove(removeLogo, this);
    logo.kill();
}

function update () {
	//do not update if client not ready
	if (!ready) return;

	player.input.left = cursors.left.isDown;
	player.input.right = cursors.right.isDown;
	player.input.up = cursors.up.isDown;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;

    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    game.physics.arcade.collide(player, tanksList);

    for (var i in tanksList){
        var curTank = tanksList[i];
        if(curTank.alive){
            game.physics.arcade.collide(player, curTank);
            curTank.update();
        }
    }

    // for (var i in tanksList)
    // {
	// 	if (!tanksList[i]) continue;
	// 	var curTank = tanksList[i].tank;
	// 	for (var j in tanksList)
	// 	{
	// 		if (!tanksList[j]) continue;
	// 		if (j!=i)
	// 		{
	// 			var targetTank = tanksList[j].tank;
	// 		}
	// 		if (tanksList[j].alive)
	// 		{
	// 			tanksList[j].update();
	// 		}
	// 	}
    // }
}

function render () {}
