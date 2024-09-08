# YouTube Music Desktop App Controller for Raycast

Control your YouTube Music Desktop App directly from Raycast!

## Prerequisites

Before using this extension, please ensure you have the following:

1. **YouTube Music Desktop App**:

   - Download and install the [YouTube Music Desktop App](https://github.com/ytmdesktop/ytmdesktop/releases).
   - Make sure the app is installed and running on your computer.

2. **Companion Server**:

   - The Companion Server must be enabled in the YouTube Music Desktop App.
   - To enable it:
     1. Open YouTube Music Desktop App.
     2. Go to Settings.
     3. Navigate to the "Integrations" tab.
     4. Enable the "Companion Server" option.

3. **Allow Companion Authentication**:
   - In the YouTube Music Desktop App settings, under the "Integrations" tab, ensure that "Allow Companion Authentication" is enabled.

## Setup

1. Install this Raycast extension.
2. Run the "YouTube Music Desktop Controller" command in Raycast.
3. If the YouTube Music Desktop App is not running, use the provided action to open it.
4. Once the app is running and detected, click on "Start Authentication Process".
5. You will receive an authentication code. Enter this code in the YouTube Music Desktop App when prompted.

## Important Notes

- **Authentication**: You need to authenticate the extension with the YouTube Music Desktop App before you can control it.

- **Companion Authentication Setting**:

  - The "Allow Companion Authentication" setting in the YouTube Music Desktop App gets automatically disabled after:
    1. A successful authentication
    2. 5 minutes of inactivity
  - You may need to re-enable this setting if you want to authenticate again after these events.

- **Troubleshooting**:
  - If you encounter any issues, ensure that both the YouTube Music Desktop App and its Companion Server are running.
  - Check that you have the latest version of the YouTube Music Desktop App installed.
