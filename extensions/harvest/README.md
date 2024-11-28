# Harvest Extension

To use this extension, you need to enter your Personal access token and Account ID from your Harvest account, which can be found [here](https://id.getharvest.com/developers).

On this screen, click **Create new personal access token** and give it a name so you can recognize it later, like "Raycast". This extension is only compatible with a single Harvest account and does not support Forecast accounts. If you have multiple accounts, be sure to select the correct Harvest account to find your account ID.

## Menu Bar Features

You can enable the "Running Timer" command to show a menu bar item that displays the current running timer. It will update automatically every minute or immediatly after you start/stop/switch timers using the Raycast extension.

## Tips and Tricks 💡

- Use the cmd + left/right arrows to navigate back to a previous day. Then select an old timer to copy it (including notes!) and restart it on today
- In the extension preferences, you can set your preferred time format—even if it's different than what your company has set. For example, the extention could display all times in hours/minutes even though the Harvest app would only should decimal hours (based on your company's Harvest settings).

### Status Folder 📁 (Advanced)

With this option, you can define a folder to store a file called `currentTimer.json`. This file will be updated every time you start/stop/switch timers using the Raycast extension. You can set this file to be watched for changes by other apps such as like Keyboard Maestro or Hazel. The contents of this file is the JSON result from the Harvest API (a [Time Entry object](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/#)). This file is deleted if no timer is running.

### Callback URL (Removed)

This feature has been removed since it would cause unexpected side-effects (such as dismissing the Raycast window when timer status changed.) Use the Status Folder method instead for automations.
