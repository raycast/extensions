# Harmony Control for Raycast

Control your Logitech Harmony Hub devices directly from Raycast with a modern, efficient interface.

![Harmony Control](metadata/harmony-control-1.png)

## Features

- 🔍 **Smart Hub Discovery**: Automatic hub detection on your local network
- 📱 **Universal Control**: Manage all your Harmony devices and activities
- ⚡️ **Quick Commands**: Fast command execution with intelligent caching
- 🎯 **Efficient Navigation**: Keyboard shortcuts for quick access
- 🔄 **Reliable Connection**: Automatic reconnection and error recovery
- 🔒 **Secure Storage**: Safe storage of hub configurations
- 💨 **Performance**: Optimized for speed with command queuing and state caching

## Requirements

- Logitech Harmony Hub connected to your local network
- macOS 11.0 or later
- Raycast v1.50.0 or later
- Network allowing local device discovery (ports 35000-35004)

## Installation

1. Open Raycast
2. Search for "Harmony Control"
3. Click Install

## Usage

### First Launch

1. Launch with `⌘ Space` and type "Harmony"
2. Wait for automatic hub discovery (usually takes 15-30 seconds)
3. Select your hub when found
4. Start controlling your devices!

### Key Features

#### Device Control
- Browse and control all your Harmony-configured devices
- Execute device-specific commands (power, volume, inputs, etc.)
- Quick access to frequently used commands

#### Activity Management
- Start and stop Harmony activities
- View current activity status
- Quick switching between activities

#### Smart Navigation
- `⌘ ⇧ A`: Switch to Activities view
- `⌘ ⇧ D`: Switch to Devices view
- `⌘ ⏎`: Execute selected command
- `⌘ B`: Go back to device list

### Preferences

Configure the extension in Raycast preferences:

#### View Settings
- **Default View**: Choose between 'activities' or 'devices' as your starting view
- **List Style**: Configure how devices and commands are displayed

#### Performance
- **Cache Duration**: Control how long device data is cached
- **Command Queue**: Adjust command execution timing
- **Network Timeout**: Set timeouts for network operations

#### Debug Options
- **Debug Mode**: Enable detailed logging for troubleshooting
- **Auto Retry**: Configure automatic retry behavior for failed commands

## Troubleshooting

### Hub Discovery Issues

If your hub isn't found automatically:
1. Verify the hub is powered on and connected to your network
2. Check that your Mac and hub are on the same network
3. Ensure ports 35000-35004 are not blocked by your firewall
4. Try restarting your Harmony Hub

### Connection Problems

If you experience connection issues:
1. Check your network connectivity
2. Verify the hub's IP hasn't changed
3. Try clearing the extension's cache
4. Restart the extension

### Command Execution Failures

If commands aren't working:
1. Ensure the target device is powered on
2. Check if the hub has line of sight to the device
3. Verify the command is supported by your device
4. Try restarting the current activity

## Technical Details

The extension uses a modern TypeScript/React architecture with:
- WebSocket-based communication for reliable control
- Intelligent command queuing for consistent execution
- Local state caching for improved performance
- Comprehensive error handling and recovery
- Secure storage for hub configurations

For detailed technical information, see [Architecture Documentation](docs/architecture.md).

## Support

If you encounter issues:
1. Check the [Troubleshooting Guide](#troubleshooting)
2. Enable debug mode in preferences for detailed logs
3. File an issue on GitHub with logs and steps to reproduce

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct before submitting pull requests.

## License

MIT License - see LICENSE file for details