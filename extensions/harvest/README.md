# Harvest Extension

To use this extension, you need to enter your Personal access token and Account ID from your Harvest account, which can be found [here](https://id.getharvest.com/developers).

On this screen, click **Create new personal access token** and give it a name so you can recognize it later, like "Raycast". This extension is only compatible with a single Harvest account and does not support Forecast accounts. If you have multiple accounts, be sure to select the correct Harvest account to find your account ID.

## Menu Bar Features

You can enable the "Running Timer" command to show a menu bar item that displays the current running timer. It will update automatically every minute or immediatly after you start/stop/switch timers using the Raycast extension.

### Callback URL (Advanced)

To enable other automations on your computer based on the current state of your Harvest timer, you can define callback URLs in the command preferences. This feature is most useful if you exclusively use Raycast to manage your Harvest timer(s), otherwise there can be up to a 60 second delay before the callback URLs are triggered. You can define a URL to trigger when a timer is started and another URL to trigger when a timer is stopped.

This feature was added with tools like BetterTouchTool and KeyboardMaestro in mind. For myself, I intend to integrate it to my Streamdeck to change the button color based on the current state of my Harvest timer!

### Status Folder (Advanced)

An alternative way to automate things based on the current state of your Harvest timer is to define a folder to save a JSON file. This file will be updated every time you start/stop/switch timers using the Raycast extension, just like the Callback URL feature. While a Callback URL may cause the Raycast window to lose focus, this status file is updated in the background, but can still be picked up by other apps that can watch folders like Keyboard Maestro or Hazel.

If a timer is running, your folder will have a file called `currentTimer.json` inside. The contents being the JSON result from the Harvest API (a [Time Entry object](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/#)). This file is deleted if no timer is running.
