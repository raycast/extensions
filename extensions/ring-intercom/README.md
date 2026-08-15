# Ring Intercom Extension for Raycast

This extension allows you to control your Ring Intercom device directly from Raycast. You can quickly unlock your door without having to open the Ring app.

## Features

- Unlock your Ring Intercom device

## Setup

1. Install the extension
2. Run the "Authenticate" command
3. Enter your Ring account email, password, and 2FA code
4. Once authenticated, you can use the "Unlock Door" command

## How it Works

The extension uses two main components:

### Authenticate Command

- Handles the Ring account authentication process
- Securely stores authentication token for future use

### Unlock Door Command

- Uses the stored token to authenticate with Ring's API
- Fetches your Ring Intercom device information
- Sends the unlock command to your device
- Provides feedback through Raycast's UI

## Important Notes and Limitations

- **Multiple Devices**: If you have multiple Ring Intercom devices on your account, the extension will only work with the first one it gets. Currently, there is no option to choose which intercom to control.
- **Authentication**: The extension uses authentication tokens that are stored securely in Raycast's local storage.
- **Token Expiration**: If you don't use the extension for 1-2 weeks or so, the stored authentication token might expire. When this happens, you'll be notified and will need to re-run the authentication command. Simply go through the process of providing your credentials again, and the unlock command should work once again after that.
- **Network Dependency**: Requires an active internet connection to communicate with Ring's servers.
- **Error Handling**: The extension will notify you if authentication fails or if the unlock command cannot be completed.

## Troubleshooting

If you encounter issues:

1. Try re-authenticating using the "Authenticate" command
2. Ensure you have a stable internet connection
3. Check if your Ring Intercom device is online in the Ring app
