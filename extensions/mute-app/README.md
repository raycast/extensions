# Mute App

Control audio output for individual Windows applications from Raycast. Mute or unmute running apps without affecting system volume.

## Features

- Browse and toggle mute for any running application
- Configure quick-action commands for frequently-used apps
- Real-time status with active/muted indicators
- Auto-refresh list at configurable intervals
- Keyboard shortcut support

**Requirements:** Windows only • Uses [NirSoft SoundVolumeView](https://www.nirsoft.net/utils/sound_volume_view.html)

## Usage

### Browse All Apps

Search "Mute App" in Raycast to view all applications with audio. Active apps appear first with a green tag. Muted apps show 🔇.

- `Enter` - Toggle mute and close
- `Cmd+Enter` - Toggle mute and keep window open

### Quick Toggle (Custom App)

For instant toggling of specific apps:

1. Configure "Toggle Mute for App 1" in Raycast preferences
2. Set process name (e.g., `chrome.exe`, `spotify.exe`)
3. Optionally disable notifications for silent operation
4. Assign a keyboard shortcut for instant access

Perfect for frequently-used apps - no browsing required.

## Configuration

**Refresh Interval** - How often the app list updates (default: 3s, options: 3s/5s/10s/Never)

**Toggle Mute for App 1:**
- Process Name - Required (e.g., `chrome.exe`, `spotify.exe`)
- Show Notification - Optional (default: enabled, disable for silent operation)

## Credits

Uses [**SoundVolumeCommandLine**](https://www.nirsoft.net/utils/sound_volume_command_line.html) by NirSoft - Freeware CLI utility for Windows audio control

## License

MIT • [View LICENSE](LICENSE)
