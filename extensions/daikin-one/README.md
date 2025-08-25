# Daikin One+ Raycast Extension

Control your Daikin One+ thermostat directly from Raycast with this extension.

## Features

- **Turn On/Off**: Quickly turn your thermostat on or off
- **Mode Control**: Switch between Cool, Heat, and Auto modes
- **Secure Authentication**: Store your credentials securely using Raycast's LocalStorage
- **Easy Setup**: Simple configuration process

## Commands

### Turn On Thermostat
Turns on your Daikin One thermostat.

### Turn Off Thermostat
Turns off your Daikin One thermostat.

### Set Cool Mode
Sets your thermostat to cool mode and turns it on.

### Set Heat Mode
Sets your thermostat to heat mode and turns it on.

### Set Auto Mode
Sets your thermostat to auto mode and turns it on.

## Setup Instructions

1. **Install the Extension**: Install this extension in Raycast
2. **Configure Credentials**: Go to Raycast Preferences → Extensions → Daikin One+ and enter your Daikin One email and password
3. **Start Controlling**: Use any of the thermostat control commands

## Security

Your Daikin One credentials are stored securely in Raycast's preferences and are only used to authenticate with the Daikin One API. The credentials are never transmitted to any third-party services.

## API Integration

This extension integrates with the Daikin One API to control your thermostat. The API endpoints used include:

- Authentication: `POST /auth/login`
- Device Control: `POST /devices/{deviceId}/control`
- Device Status: `GET /devices/{deviceId}/status`
- Device List: `GET /devices`

## Troubleshooting

### Authentication Issues
- Make sure your Daikin One credentials are correct
- Try running the "Configure Daikin One" command again
- Check that your Daikin One account is active

### Device Not Found
- Ensure your Daikin One thermostat is properly connected to your account
- Try refreshing your device list by re-authenticating

### Network Issues
- Check your internet connection
- Ensure the Daikin One service is available in your region

## Development

To contribute to this extension:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run in development mode: `npm run dev`
4. Build for production: `npm run build`

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.