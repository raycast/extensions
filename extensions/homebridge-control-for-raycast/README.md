# HomeBridge Control for Raycast

Control and monitor your Homebridge devices directly from Raycast with this extension. Manage lights, switches, sensors, and more with ease.

## Features

- **Device Management**: Turn Homebridge-connected devices on or off directly from Raycast.
- **Real-time Monitoring**: Check the status of your devices, such as temperature sensors, battery levels, and other connected accessories.
- **Favorites**: Mark devices as favorites for quick access.
- **Easy Configuration**: Update your Homebridge settings such as URL, username, and password directly within Raycast preferences.
- **Brightness Control**: Adjust the brightness of connected lights.

## Installation

1. Search for "HomeBridge Control for Raycast" in the Raycast Store and install the extension.
2. When running the extension for the first time, the preferences panel will automatically open for you to configure your Homebridge settings.
3. Configure the extension by setting up your Homebridge server details (URL, username, and password).

## Setup

### Configuring Homebridge Connection

To connect Raycast to your Homebridge server, you'll need to configure the extension preferences directly through Raycast:

- **URL**: The URL of your Homebridge server. Typically, something like `http://your-homebridge-server.local:8581`.
- **Username**: Your Homebridge username used to log into the Homebridge UI.
- **Password**: Your Homebridge password used to log into the Homebridge UI.

#### First-Time Setup

When you first install and run the extension, the preferences panel will automatically open to allow you to configure your Homebridge connection settings. Simply enter the **URL**, **Username**, and **Password** fields to connect to your Homebridge server.

#### Token-Based Authentication

Upon entering your credentials, the extension will use the username and password to authenticate with your Homebridge server and generate a token for future requests. The token will be stored securely, so you won't need to re-enter your credentials unless the token expires or the connection fails.

If the authentication fails or the token becomes invalid, the preferences panel will automatically reopen, prompting you to verify and re-enter your credentials to ensure a successful connection.

#### Manual Updates

To update your Homebridge server credentials after the initial setup:

1. Open Raycast.
2. Navigate to Raycast Preferences by clicking on the Raycast icon in the top menu bar, and selecting **Preferences**.
3. Find the **Homebridge Control** extension in the Extensions section.
4. Enter your Homebridge URL, username, and password in the respective fields in the extension preferences.

## Usage

### Managing Devices

- **Command**: `Manage Homebridge Devices`
- **Functionality**: Use this command to toggle your devices on or off, adjust brightness levels, and view the status of each connected device.
    - Mark accessories as favorites for quick access.
    - Adjust the brightness of lights using predefined percentages or manually set the value.

### Updating Preferences

If your Homebridge server credentials change, you can update the URL, username, and password in the preferences:

1. Open Raycast and go to **Preferences**.
2. Update the details in the **Homebridge Control** extension.

## Troubleshooting

If you encounter issues such as being unable to connect to your Homebridge server, ensure that:
- The URL, username, and password are correctly entered in the extension settings.
- Your Homebridge server is online and accessible from the network your computer is connected to.
- You have the latest version of Homebridge installed.

If authentication fails, re-check your credentials and ensure that your Homebridge server is running the latest software version. If the connection fails, Raycast will automatically open the preferences for you to verify and re-enter the correct credentials.

## Contributing

Contributions to "HomeBridge Control for Raycast" are welcome. Please feel free to fork the repository, make changes, and submit pull requests.

## Support

Need help? Have suggestions? Please open an issue in the GitHub repository for this extension.

## License

"HomeBridge Control for Raycast" is released under the MIT license. Feel free to use, modify, and distribute it as per the license terms.