# Extend Display

Raycast extension to quickly connect to AirPlay/Sidecar displays while seamlessly preserving your audio output. No more audio switching to your iPad or Mac display!

## ✨ Features

- 🔍 Auto-discovery: Scan for available displays via System Settings dropdown
- ⚡ One-click toggle: Connect or disconnect instantly with proper state detection
- 🔊 Seamless audio preservation: Aggressive audio locking prevents any audible leak to the display
- ⌨️ Quick Connect: Configure a default display and connect with a single command
- 🎯 Fast & reliable: Uses proven Sidecar extension approach with AXPress actions

## 🎯 Use Cases

Perfect for:

- Extending your Mac to an iPad without losing audio on your AirPods/headphones
- Using another Mac as a display while keeping audio on your main Mac
- Quickly toggling between extended and single-display setups

## 📋 Requirements

### 1. SwitchAudioSource (Required)

Manages audio output to prevent switching.

```bash
brew install switchaudio-osx
```

The extension will prompt you to install it if missing.

### 2. Accessibility Permissions (Required)

Allows Raycast to control System Settings.

System Settings → Privacy & Security → Accessibility → Enable Raycast

## 🚀 Usage

### Browse Mode (Recommended for first use)

1. Open Raycast: `⌘ Space`
2. Search: "Connect to Display"
3. Press **Enter** to scan for available displays (opens System Settings briefly)
4. Select your display and press Enter to connect
5. Audio stays on your current output device seamlessly!

**Keyboard shortcuts:**

- `Enter` - Connect to selected display (or scan if empty)
- `⌘⇧Q` - Set/clear as Quick Connect display
- `⌘R` - Rescan for displays
- `⌘N` - Add display manually
- `⌘O` - Open System Settings to see display names
- `Ctrl+X` - Remove a display

### Quick Connect Mode (For daily use)

1. Open Raycast: `⌘ Space`
2. Search: "Connect to Display", select your display, and press `⌘⇧Q` to set it as Quick Connect
3. Search: "Quick Connect"
4. Instant toggle with one command!

You can also set the display name manually in extension preferences as a fallback.

Pro tip: Assign a hotkey to Quick Connect for instant access.

## 🎛️ Commands

| Command            | Mode    | Description                                 |
| ------------------ | ------- | ------------------------------------------- |
| Connect to Display | View    | Browse and connect to any available display |
| Quick Connect      | No-view | Instantly toggle your configured display    |

## 🔧 How It Works

### Display Connection

Uses the battle-tested approach from Raycast's official [Sidecar extension](https://github.com/raycast/extensions/tree/main/extensions/sidecar):

1. Opens System Settings → Displays
2. Finds the dropdown menu button (works on macOS Tahoe 26+ and earlier)
3. Navigates through "Mirror or extend to" section
4. Uses `AXPress` accessibility action (more reliable than click)
5. Detects connection state via `system_profiler`

### Audio Preservation (The Magic ✨)

Three-layer aggressive approach ensures no audio leaks to the display:

1. Force Lock: Sets audio to original device 10 times in 2 seconds (during connection)
2. Rapid Monitoring: Checks every 100ms (not 500ms) for changes
3. Quick Revert: Does 3 rapid re-sets if any switch detected

Result: Any audio switch happens so fast (< 100ms) it's imperceptible to human ears.

## 🐛 Troubleshooting

| Issue                                | Solution                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| "Missing Dependencies"               | Install SwitchAudioSource: `brew install switchaudio-osx`                                       |
| "Could not find display menu button" | System UI may have changed. Please report an issue with your macOS version                      |
| "Display not found in menu"          | Ensure target device is unlocked, nearby, and has AirPlay/Sidecar enabled                       |
| Script fails or hangs                | Check Accessibility permissions: System Settings → Privacy & Security → Accessibility → Raycast |
| Audio still switches briefly         | This is expected - the revert is < 100ms and should be imperceptible                            |
| No displays found                    | Make sure devices are on same WiFi and Bluetooth is enabled                                     |

## 🏗️ Technical Details

- Built with: [@raycast/api](https://developers.raycast.com/)
- Audio management: [switchaudio-osx](https://github.com/deweller/switchaudio-osx)
- UI automation: AppleScript with System Events accessibility
- Inspired by: [Sidecar extension](https://github.com/raycast/extensions/tree/main/extensions/sidecar)

## 📝 License

MIT

## 🙏 Credits

- Apple Sidecar extension approach from [Raycast Extensions](https://github.com/raycast/extensions)
- Audio switching solution inspired by the need to preserve audio on AirPods while extending to iPad
