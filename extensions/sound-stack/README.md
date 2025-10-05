# Sound Stack

Manage your macOS audio devices with priority-based automatic switching. Never manually switch audio devices again when your headphones connect or disconnect.

## Why This Exists

I built this extension because I was frustrated with constantly checking my sound settings every time I docked my computer or connected my Bluetooth headphones. I wanted my AirPods as my main output device and my external RODE microphone as the input — not the AirPods microphone.

Here's the thing: Bluetooth headphone audio quality is significantly better when you're not also using the headphone's built-in microphone. With Sound Stack, you can set your AirPods (or any Bluetooth headphones) as the audio output and use your MacBook's built-in mic or an external microphone as the input. Your Mac will automatically maintain this setup.

I firmly believe this should be built into macOS. Until then, this extension solves the problem.

## Features

### 🎯 Priority-Based Device Management
Set up your preferred order for audio input and output devices. Sound Stack remembers your preferences and automatically switches to the highest priority available device.

### 🔄 Two Ways to Use

**Manual Mode (No Background Process)**
- Use the "Switch to Priority Devices" command whenever you want to check and switch
- No background processes required
- Perfect for users who want full control

**Automatic Mode (Background Monitoring)**
- Enable "Automatic Priority Switching" in preferences
- Background monitoring checks for device changes every 60 seconds (configurable)
- Automatically switches when devices connect or disconnect
- Get notified when switches happen

## Commands

### List Devices
View and reorder all your audio devices by priority. Use keyboard shortcuts to quickly adjust priorities:
- **Cmd+T** - Set as top priority
- **Cmd+Opt+↑/↓** - Move up/down in priority
- **Cmd+B** - Move to bottom
- **Cmd+Backspace** - Remove disconnected device from list

### Switch to Priority Devices
Instantly check and switch to your highest priority devices. Works independently of background monitoring.

### Priority Monitor (Background)
Background service that monitors device changes. Enable "Automatic Priority Switching" in preferences to activate.

## Configuration

### Preferences

**Also switch system sound effects** (Default: Enabled)
When switching output devices, also change where system alert sounds and notification beeps play. Most users want this enabled.

**Enable Automatic Priority Switching** (Default: Disabled)
Automatically switch to the highest priority available device when audio devices connect or disconnect.

**Background Monitoring Interval** (Default: 60 seconds)
How often to check for audio device changes in the background. Lower values are more responsive but use more system resources.
- 15 seconds (Most Responsive)
- 30 seconds (Responsive)
- 60 seconds (Balanced) ← Default
- 2 minutes (Conservative)
- 5 minutes (Minimal Impact)

## How It Works

1. **Set Your Priorities**: Open "List Devices" and arrange devices in your preferred order
2. **Choose Your Mode**:
   - Manual: Use "Switch to Priority Devices" command when needed
   - Automatic: Enable the preference and let the background monitor handle it
3. **Enjoy**: Your audio devices now switch automatically based on your priorities

## Tips

- The first device in your priority list is your most preferred device
- Disconnected devices stay in your list so priorities are maintained when they reconnect
- Use the manual "Switch to Priority Devices" command to force a check without enabling automatic mode
- Background monitoring uses smart caching to minimize system resource usage

## Requirements

- macOS (built-in audio device management required)
- Raycast

## Credits

This extension was originally developed as a fork of the [Audio Device extension](https://www.raycast.com/benvp/audio-device) by benvp. I wouldn't have been able to build this without using that extension as inspiration and a starting point.

## License

MIT