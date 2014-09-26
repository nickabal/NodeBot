var irc = require("irc");
var fs = require('fs');
var crypto = require('crypto');

var config = {
  channels: ["#rio"],
  server: "irc.zenlair.net",
  botName: "nodebot",
  webserver: "73.162.12.127"
};

// Join default channels in config
var bot = new irc.Client(config.server, config.botName, {
  channels: config.channels
});

// static properties / Channel class constructor
Channel._channelMap = {};

Channel.getChannels = function() {
  var channelIdList = [];
  for(var channel in Channel._channelMap) {
    if(Channel._channelMap.hasOwnProperty(channel)
      && Channel._channelMap[channel].constructor === "Channel") {
        channelIdList.push(channel);
    }
  }
  return channelIdList;
}
Channel.prototype.addMessage = function(user, text) {
  this.chatlog.push({'user': user, 'message': text});
}
Channel.prototype.getMessages = function() {
  return this.chatlog;
}
Channel.getChannel = function(name) {
  if ( this._channelMap[name] ) {
    return this._channelMap[name];
  }
  else {
    var newchannel = new Channel(name);
    return newchannel;  
  }
}
function Channel(name) {
    this.record = false;
    this.chatlog = [];
    this.name = name;
    Channel._channelMap[name] = this;
}

// Help function
bot.addListener("message", function(from, to, text, message) {
  var regex = /^\.help/
  if ( text.match(regex) ) {
    var arrtext = text.split(" ");
    var command = arrtext[1];
    if ( !command ) { 
      bot.say(to, "Available commands: .invite .leave .startrecord .stoprecord .postrecord .wb");
    }
    else if ( command.match("invite") ) { bot.say(to, "Get bot to join a channel, usage: .invite #channel" ); }
    else if ( command.match("leave" ) ) { bot.say(to, "Kick bot out of your channel, usage: .leave" ); }
    else if ( command.match("startrecord" ) ) { bot.say(to, "Start recording in the channel, usage: .startrecord" ); }
    else if ( command.match("stoprecord" ) ) { bot.say(to, "Stop recording in the channel, usage: .stoprecord" ); }
    else if ( command.match("postrecord" ) ) { bot.say(to, "Post last recording to webserver, usage: .postrecord" ); }
    else if ( command.match("wb" ) ) { bot.say(to, "Welcome people back, usage: .wb name" ); }
  }
});

// Controlling Bot
bot.addListener("message", function(from, to, text, message) {

  var regexinvite = /^\.invite/
  var regexleave = /^\.leave/
  if ( text.match(regexinvite) ) {
    var arrtext = text.split(" ");
    var channel = Channel.getChannel(arrtext[1]);
    bot.say(to, "Joining "+channel.name);
    bot.join(channel.name);
  }
  else if ( text.match(regexleave) ) {
    bot.part(to);
    //maybe remove channel from channelmap here
  }

  var regexstartrecord = /^\.startrecord/
  var regexstoprecord = /^\.stoprecord/
  var regexpostrecord = /^\.postrecord/
  if ( text.match(regexstartrecord) ) {
    var channel = Channel.getChannel(to);
    channel.chatlog.length = 0;
    channel.record = true;
    bot.say(to, "Started recording in "+channel.name);
  }
  else if ( text.match(regexstoprecord) ) {
    var channel = Channel.getChannel(to);
    channel.record = false;
    bot.say(to, "Stopped recording in "+channel.name);
  }
  else if ( text.match(regexpostrecord) ) {
    var channel = Channel.getChannel(to);
    var stamp = crypto.randomBytes(3).toString('hex');
    var stream = fs.createWriteStream("webfiles/chat-"+ stamp +".log");
    stream.once('open', function(fd) {
      channel.chatlog.forEach(function(msg) {
        stream.write(msg.user+": "+msg.message+"\n");
      });
    stream.end();
    });
    // Put a symbolic link from webfiles to your webserver directory
    bot.say(channel.name, "Posting conversation to: http://"+config.webserver+"/chatlogs/chat-"+ stamp +".log");
  }
});

// Recording section
bot.addListener("message", function(from, to, text, message) {
  var channel = Channel.getChannel(to);
  if ( channel.record ) {
    channel.addMessage(from, text)
  }
});
bot.addListener("join", function(inchannel, who) { 
  var channel = Channel.getChannel(inchannel);
  if ( channel.record ) {
    channel.addMessage("JOINED", who)
  }
});

// Fun Section
bot.addListener("message", function(from, to, text, message) {
  regexwb = /^\.wb/
  if ( text.match(regexwb) ) {
    arrtext = text.split(" "); 
    var person = arrtext[1];
    bot.say(to, "Welcome back "+person+"!");
  }

});

// Catch IRC errors
bot.addListener('error', function(message) {
    console.log('error: ', message);
});






