# Twitch Extension

## Setup Guide

### Twitch Username

To use the "Following Channels" Feature or the menu-bar "Live Followed Channels" Feature, you need to provide a Twitch Username in the Raycast Extension preferences.

You can find yours on Twitch directly:
- Go to [your settings page](https://www.twitch.tv/settings/profile)
- Under "Profile Settings"
- There is an item called "Username", this is what you are looking for.

#
## FAQ

### I've got a blank page when I open the command.
When the search query is empty, this is likely normal:
- for the "Search Games" command, this empty screen will become populated with your recent searches.
- for the "Search Streams" command, this empty screen will become populated with your recent searches.
- for the "Following Channels" command, this empty screen will become populated when you follow a channel on Twitch.

### Why does it say "deprecated" on the "Client ID" and "Authorization Token" preferences?
This extension used to require you to provide your own Client ID and Authorization Token obtained from a 3rd party application (twitchtokengenerator.com/quick/DvKMUdT92X or twitchapps.com/tokengen). This is no longer the case and we now use Raycast to manage the authentification process. This new process is much more secure and easier to use, but we've kept the old fields for retro-compatibility.