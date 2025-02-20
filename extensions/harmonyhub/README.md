# Harmony Raycast Extension

Control your Logitech Harmony Hub directly from Raycast. This extension allows you to manage your devices, execute commands, and control activities without leaving your keyboard.

## Features

- 🔍 Automatic hub discovery on your network
- 📱 Control all your Harmony-connected devices
- ⚡️ Quick access to device commands
- 🎮 Start and stop activities
- 🔄 Real-time status updates
- ⌨️ Full keyboard navigation

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Install the Harmony extension from the Raycast store
3. The extension will automatically discover your Harmony Hub(s) on the network

## Usage

### Hub Connection

The extension will automatically discover Harmony Hubs on your local network. 

**Note**: If only one Harmony Hub is found on your network, the extension will automatically connect to it. This auto-connection behavior is designed to streamline the experience for users with a single hub setup.

### Device Control

1. Select a device from the list
2. Browse available commands
3. Execute commands with a single click or keyboard shortcut

### Activities

1. View all configured activities
2. Start or stop activities
3. See real-time activity status

## Keyboard Shortcuts

- `⌘ + R`: Refresh hub/device list
- `⌘ + [`: Go back to previous view
- `⌘ + Backspace`: Clear cache
- `⌘ + Shift + R`: Reconnect to hub
- `⌘ + Shift + A`: Switch to Activities view
- `⌘ + Shift + D`: Switch to Devices view
- `⌘ + K`: Open command palette for quick actions

## Configuration Options

### Extension Preferences

The following preferences can be configured in the Raycast preferences for the Harmony extension:

#### Command Execution
- `commandHoldTime` (default: "100"): Duration in milliseconds to hold a command when executing. Increase this value if commands are not being recognized by your devices.

#### Hub Discovery
- `discoveryTimeout` (default: "5000"): Maximum time in milliseconds to wait for hub discovery. Increase this value if your hubs are not being found on slower networks.
- `discoveryCompleteDelay` (default: "500"): Time in milliseconds to wait after finding a hub before completing discovery. Helps ensure all hubs are found.

#### Caching
- `cacheTTL` (default: "86400000"): Time in milliseconds (24 hours) before cached hub data expires. Decrease this value if your hub configuration changes frequently.
- `maxCacheEntries` (default: "1000"): Maximum number of entries to keep in the log history.

#### Logging
- `minLogLevel` (default: "INFO"): Minimum level of messages to log. Options: "DEBUG", "INFO", "WARN", "ERROR"
- `includeTimestamp` (default: true): Whether to include timestamps in log messages
- `includeLogLevel` (default: true): Whether to include the log level in messages
- `logToasts` (default: true): Whether to log toast notifications

### Network Requirements

The extension requires the following network conditions:
- Harmony Hub and computer must be on the same local network
- UDP port 5222 must be accessible for hub discovery
- TCP port 8088 must be accessible for hub communication
- No firewall rules blocking Harmony Hub communication

## Troubleshooting Guide

### Hub Discovery Issues

#### Hub Not Found
1. Verify the Harmony Hub is powered on and connected to your network
2. Check that your computer and hub are on the same network
3. Ensure required ports (5222, 8088) are not blocked by firewall
4. Try increasing the `discoveryTimeout` preference
5. Restart the Harmony Hub

#### Multiple Hubs Not Detected
1. Increase the `discoveryCompleteDelay` preference
2. Ensure all hubs are powered on and connected
3. Try discovering hubs one at a time
4. Clear the hub cache and retry discovery

### Command Execution Issues

#### Commands Not Recognized
1. Increase the `commandHoldTime` preference
2. Verify the device is powered on and in range
3. Check if the command works using the Harmony app
4. Try clearing the command cache
5. Re-run hub discovery to refresh device data

#### Delayed Command Response
1. Check network latency to your hub
2. Ensure no other apps are controlling the hub
3. Verify hub firmware is up to date
4. Try reducing the `commandHoldTime` preference

### Activity Issues

#### Activities Won't Start
1. Verify all required devices are powered on
2. Check if activity works in Harmony app
3. Clear hub cache and retry
4. Check for device conflicts
5. Restart the hub if issues persist

#### Activity Status Not Updating
1. Check network connectivity to hub
2. Clear the hub cache
3. Re-run hub discovery
4. Verify hub firmware is up to date

### Connection Issues

#### Hub Disconnects Frequently
1. Check network stability
2. Verify hub power supply
3. Update hub firmware
4. Clear hub cache and rediscover
5. Try moving hub closer to router

#### Cannot Connect to Hub
1. Verify hub IP address is correct
2. Check network firewall settings
3. Ensure hub is not in use by another app
4. Try restarting the hub
5. Clear all caches and rediscover

### Cache Issues

#### Incorrect Device Data
1. Clear the hub cache
2. Re-run hub discovery
3. Verify device configuration in Harmony app
4. Check hub firmware version
5. Reduce `cacheTTL` if issues persist

#### Performance Issues
1. Check `maxCacheEntries` setting
2. Clear old log entries
3. Verify available system memory
4. Reduce logging level if needed

### Error Recovery Steps

For any error, the extension will provide:
1. Error category and description
2. Recommended recovery actions
3. Detailed error message in logs
4. Option to retry the operation
5. Option to clear cache if relevant

If issues persist:
1. Set `minLogLevel` to "DEBUG"
2. Reproduce the issue
3. Check logs for detailed error information
4. Try suggested recovery actions
5. If unresolved, report the issue with logs

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/harmony-raycast-extension.git

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.