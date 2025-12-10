# Mic Mute

A Raycast extension to toggle your microphone on/off with a menu bar indicator.

## Features

- **Menu bar indicator**: Shows the current mic state (muted/unmuted) in your menu bar
- **Quick toggle**: Click the menu bar icon or use a keyboard shortcut to toggle mute
- **Volume restoration**: Remembers your last volume level and restores it when unmuting
- **Configurable default volume**: Set a fallback unmute volume in preferences

## Platform Support

This extension currently supports **macOS only**. It uses AppleScript to control the system input volume.

## Preferences

| Preference | Description | Default |
|------------|-------------|---------|
| Default Unmute Volume | Volume level (0-100) to use when unmuting if no previous volume was saved | 70 |

## How It Works

1. When you mute the microphone, the current volume is saved
2. When you unmute, the extension restores your previous volume level
3. If no previous volume is available, it uses the configured default (70%)
