# Hotel Manager for Raycast

Manage your [Hotel](https://github.com/typicode/hotel) apps directly from Raycast.

## Features

- **List Apps**: View all your Hotel apps and their status.
- **Start/Stop**: Toggle apps on/off.
- **Open in Browser**: Quickly open apps via configured TLD (default `.local`).
- **Open Direct URL**: Open apps via direct IP:Port (Option + Enter).
- **Copy URL**: Copy the app URL to clipboard (Cmd + C).
- **Open Project Folder**: Open the app's directory in Finder (Ctrl + Enter).
- **Restart**: Restart the app (Cmd + Shift + R).

## Requirements

- Hotel must be running (`hotel start`).
- Hotel API must be accessible at `http://localhost:2000` (default).

## Configuration

The extension assumes Hotel is running on `http://localhost:2000`. It automatically detects your TLD from `~/.hotel/conf.json` (defaults to `.local`).

## Credits

Inspired by [alfred-hotel](https://github.com/exah/alfred-hotel).
