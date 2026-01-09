# AudioScenes

Switch audio outputs and connect Bluetooth devices with one action. Create scene presets for instant switching with optional keyboard shortcuts.

## Use Cases

- **Work call starting** - One shortcut connects your headset, sets the mic, and opens Zoom
- **Music time** - Switch to your Bluetooth speaker at 70% volume and launch Spotify
- **Late night** - Quickly switch to headphones without waking anyone up
- **Back to laptop** - Return to built-in speakers after unplugging from your desk setup

## Features

- Connect Bluetooth audio devices and set them as system output
- Switch between built-in speakers, DisplayPort, and other outputs
- Create scene presets that remember your preferred settings
- Set volume level, input device, and launch apps when activating a scene
- Assign keyboard shortcuts to scenes via Raycast Quicklinks

## Requirements

This extension requires two command-line tools installed via Homebrew:

```bash
brew install switchaudio-osx blueutil
```

- **SwitchAudioSource** - Required for all audio switching
- **blueutil** - Only required if you use Bluetooth devices

## Permissions

If using Bluetooth features, grant Raycast access in:

**System Settings > Privacy & Security > Bluetooth > Raycast**

## Keyboard Shortcuts for Scenes

To trigger a scene with a keyboard shortcut:

1. Open **Scene Presets** and select a scene
2. Press `Cmd+Shift+C` to copy the hotkey link
3. Paste the link in Raycast to create a Quicklink
4. Assign your preferred hotkey to the Quicklink
