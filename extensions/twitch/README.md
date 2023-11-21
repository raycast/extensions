# Twitch Extension

## Setup Guide

### Client ID & Client Secret

To use the "Following Channels" Feature you need to provide Twitch credentials. You can get them by creating a new application on the [Twitch Developer Console](https://dev.twitch.tv/console/apps/create). 

On the dev console when creating an app, you need to provide the following information. It doesn't matter if you get it wrong, you can always edit it later:
- **Name**: any name you want, this is just for your own reference
- **OAuth Redirect URLs**: `https://www.raycast.com/redirect?packageName=Extension`
- **Category**: Application Integration (or any other category you want, it doesn't matter for this extension)

Once the app is created, click on **Manage** on [the dashboard](https://dev.twitch.tv/console/apps) to obtain your Client ID and Client Secret:
- **Client ID**: available at the bottom
- **Client Secret**: click on **New Secret** to obtain a new one. It will only be visible once, but you can always generate a new one.

Copy the Client ID and Client Secret and paste them in the Raycast input fields of this extension.

#
## FAQ

### Error: Invalid OAuth Token 
This means that you have specified an incorrect Client ID and Client Secret, or that this Client Secret was not created in conjunction with the specified client ID.

### I've got a blank page when I open the command.
This is intentional, a search parameter must be specified first. (This might change in the future)