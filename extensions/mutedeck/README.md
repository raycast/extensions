# MuteDeck for Raycast

Control your meeting audio, video, and more directly from Raycast. This extension provides quick access to MuteDeck's functionality through Raycast commands.

## Features

- **Toggle Microphone**: Quickly mute/unmute your microphone
- **Toggle Video**: Turn your camera on/off
- **Leave Meeting**: Exit meetings with confirmation protection
- **Show Status**: View your current meeting state and controls

## Prerequisites

- macOS 12.0 or later
- Raycast 1.50.0 or later
- [MuteDeck](https://mutedeck.com) installed and running
- Active meeting for controls to work

## Installation

1. Install [MuteDeck](https://mutedeck.com) if you haven't already
2. Install this extension from the Raycast Store
3. Configure your API endpoint (default: http://localhost:3491)
4. Set up your preferred keyboard shortcuts

## Configuration

### API Endpoint

The extension needs to know where to find your MuteDeck instance:

1. Open Raycast Settings
2. Navigate to Extensions > MuteDeck
3. Set the API Endpoint (default: http://localhost:3491)

### Status Refresh Interval

Control how often the status display updates:

1. Open Raycast Settings
2. Navigate to Extensions > MuteDeck
3. Set the Status Refresh Interval in seconds (default: 1)

### Safety Features

Configure confirmation dialogs to prevent accidental actions:

- **Confirm Leave Meeting**: Show confirmation before leaving meetings
- **Confirm Mute While Presenting**: Extra protection while presenting
- **Confirm Video While Presenting**: Extra protection while presenting
- **Show Toast Notifications**: Enable/disable feedback notifications

## Commands

### Toggle Microphone
- Default shortcut: None (customizable)
- Toggles microphone mute state
- Shows current state via toast notification
- Optional confirmation when presenting

### Toggle Video
- Default shortcut: None (customizable)
- Toggles camera on/off state
- Shows current state via toast notification
- Optional confirmation when presenting

### Leave Meeting
- Default shortcut: None (customizable)
- Exits the current meeting
- Optional confirmation dialog
- Works across supported platforms

### Show Status
- Default shortcut: None (customizable)
- Displays current meeting state
- Shows microphone, camera, and meeting status
- Real-time updates based on refresh interval

## Support

Need help or want to contribute?

- [MuteDeck Support](https://mutedeck.com/support) - For MuteDeck-specific issues
- [Report Extension Issues](https://github.com/raycast/extensions/issues) - For extension-related problems
- [Contribute](https://github.com/raycast/extensions) - Help improve the extension

## Privacy & Security

- Communicates only with local MuteDeck instance
- No data sent to external servers
- Secure preference handling
- Local API communication only