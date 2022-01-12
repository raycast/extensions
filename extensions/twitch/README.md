# Twitch Extension

## Setup Guide

### Client-Id and Bearer Token

To use the "Following Channels" Feature you need the "user:read:follows" scope.

With this Link you don't have to care about scopes and just get started:
https://twitchtokengenerator.com/quick/DvKMUdT92X

After the authentication process copy the Client-Id and the Access Token(Bearer) into the Input fields.

#
## FAQ

### Error: Invalid OAuth Token 
This means that you have specified an incorrect OAuth token, or that this OAuth token was not created in conjunction with the specified client ID.

### Error: Missing Scope: user:read:follows
This error means that you did not specify the required scope to query your followed channels.

### I've got a blank page when I open the command.

This is intentional, a search parameter must be specified first. (This might change in the future)