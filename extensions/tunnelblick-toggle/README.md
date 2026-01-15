# Tunnelblick Toggle for Raycast

This Raycast extension allows you to quickly connect and disconnect your Tunnelblick VPN configurations directly from Raycast.

[View on GitHub](https://github.com/bjrump/tunnelblick-raycast)

## Features

- **Smart Toggling**: Automatically detects your available VPN configuration.
- **Single or Multiple Configs**: Works seamlessly whether you have one or multiple VPN profiles.
- **Status Feedback**: Displays HUD notifications for "Connecting..." and "Disconnecting...".
- **Zero Configuration**: No complex setup required—it just reads from Tunnelblick.

## How it Works

The extension uses AppleScript to communicate with the Tunnelblick application. It:

1.  Retrieves the list of available configurations.
2.  Parses the list to find the first valid configuration name.
3.  Checks its current state (Connected/Disconnected).
4.  Toggles it accordingly.

## Requirements

- **Tunnelblick** (running)
- **Raycast**
- **Permissions**: You must allow Raycast to control Tunnelblick via AppleScript (macOS will prompt you on first run).

## License

MIT
