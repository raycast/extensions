# Volumio Control for Raycast

Control your Volumio music player directly from Raycast.

## Features

### Individual Media Commands
- **Play/Pause** - Toggle playback with a single command
- **Play** - Start playback
- **Pause** - Pause playback
- **Next Track** - Skip to the next track
- **Previous Track** - Go back to the previous track
- **Stop** - Stop playback completely
- **Toggle Shuffle** - Turn shuffle mode on/off

### Full Control Views
- **Now Playing** - See what's currently playing with album art and full controls
- **Media Controls** - Complete media control panel with all playback options
- **Browse Music** - Browse and play your music library

## Installation

1. Make sure you have Raycast installed
2. Clone this repository
3. Run `npm install` to install dependencies
4. Run `npm run build` to build the extension
5. Run `npm run dev` to run in development mode
6. Or import the extension to Raycast using the Import Extension command

## Configuration

In Raycast preferences for this extension:
- **Volumio Host**: Set your Volumio hostname or IP address (defaults to `volumio.local`)

## Usage

### Quick Commands (no-view)
These commands execute immediately without opening a window:
- `Play/Pause` - Toggle playback
- `Play` - Start playing
- `Pause` - Pause playback
- `Next Track` - Skip forward
- `Previous Track` - Skip backward
- `Stop` - Stop playback
- `Toggle Shuffle` - Switch shuffle on/off

### View Commands
These commands open a window with more options:
- `Now Playing` - See current track with album art and controls
- `Media Controls` - Full control panel with volume, shuffle, repeat
- `Browse Music` - Navigate your music library and play content


## Requirements

- Volumio instance running on your network
- Network access to your Volumio instance
- Volumio API must be accessible (usually on port 80)

## Troubleshooting

If you can't connect to Volumio:
1. Verify your Volumio instance is running
2. Check the hostname/IP in extension preferences
3. Ensure you can access Volumio web interface at `http://[your-volumio-host]`
4. Check your network connection