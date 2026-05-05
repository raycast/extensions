# AirSync Raycast Extension

Control your AirSync macOS app directly from Raycast with this powerful extension.

## Features

This extension provides 9 commands to interact with your AirSync app:

### 1. 📱 Show Status
View detailed information about your connected Android device:
- Device name
- IP address and port
- ADB connection status
- Notification count
- Device version

### 2. 🔌 Disconnect Device
Quickly disconnect from your currently connected device with visual feedback.

### 3. 🔄 Reconnect Device
Reconnect to your last connected device on the current network.

### 4. 🔔 View Notifications
Browse and interact with all notifications from your Android device:
- View notification title, body, and source app with app icons
- **Reply to notifications** with a text input form
- **Execute notification actions** (Mark as Read, etc.)
- **Dismiss notifications** with ⌘D
- Copy notification content
- Two-row layout with full-width detail view

### 5. 🎵 Media Controls
View and control media playback on your device:
- Track title, artist, and album art
- Playing/paused status
- Volume level with visual bar
- Like/dislike status
- **Interactive controls:**
  - ⌘⇧P: Play/Pause toggle
  - ⌘⇧N: Next track
  - ⌘⇧B: Previous track
  - ⌘⇧L: Like/Unlike track
  - ⌘R: Refresh
  - ⌘C: Copy track info

### 6. 🎥 Android Mirror
Launch full device mirroring to view your entire Android screen on macOS.

### 7. 🖥️ Desktop Mode
Launch desktop mode mirroring (requires Android 15+).

### 8. 📱 Mirror App
Browse and mirror specific apps from your device:
- List all installed apps with icons
- Filter by user apps or system apps
- See which apps are listening for notifications
- **Connect ADB** directly from the view (⌘A)
- Launch any app in mirroring mode

### 9. 🔗 Connect ADB
Connect to your device via ADB for mirroring features. Provides detailed feedback for:
- Successful connection
- Connection already in progress
- ADB not found (with installation instructions)
- Device not found
- Various connection errors

## Requirements

- macOS with [AirSync](https://www.sameerasw.com/airsync) app installed and running
- Raycast installed
- Node.js 20+ (for development)

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/sameerasw/airsync-raycast.git
cd airsync-raycast
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Development

### Project Structure

```
airsync-raycast/
├── src/
│   ├── status.tsx              # Device status command
│   ├── disconnect.tsx          # Disconnect command
│   ├── reconnect.tsx           # Reconnect command
│   ├── notifications.tsx       # Notifications list with actions
│   ├── reply-notification.tsx  # Reply form for notifications
│   ├── media.tsx               # Media player with controls
│   ├── launch-mirroring.tsx    # Full device mirroring
│   ├── desktop-mode.tsx        # Desktop mode mirroring
│   ├── mirror-app.tsx          # App-specific mirroring
│   ├── connect-adb.tsx         # ADB connection command
│   └── utils/
│       └── applescript.ts      # AppleScript utilities
├── assets/
│   └── extension-icon.png      # Extension icon (512x512)
├── package.json                # Extension manifest
└── tsconfig.json               # TypeScript configuration
```

### AppleScript Commands Used

The extension communicates with AirSync using these AppleScript commands:

#### Device Management
- `tell application "AirSync" to get status` - Get device status (returns JSON)
- `tell application "AirSync" to disconnect` - Disconnect from device
- `tell application "AirSync" to reconnect` - Reconnect to device
- `tell application "AirSync" to connect adb` - Connect via ADB

#### Notifications
- `tell application "AirSync" to get notifications` - Get notifications (returns JSON array)
- `tell application "AirSync" to notification action "id|action_name|reply_text"` - Perform notification action
- `tell application "AirSync" to dismiss notification "id"` - Dismiss notification

#### Media Controls
- `tell application "AirSync" to get media` - Get media info (returns JSON)
- `tell application "AirSync" to media control "toggle"` - Play/pause
- `tell application "AirSync" to media control "next"` - Next track
- `tell application "AirSync" to media control "previous"` - Previous track
- `tell application "AirSync" to media control "like"` - Like/unlike track

#### Mirroring
- `tell application "AirSync" to launch mirroring` - Launch full device mirroring
- `tell application "AirSync" to desktop mode` - Launch desktop mode
- `tell application "AirSync" to get apps` - Get list of apps (returns JSON)
- `tell application "AirSync" to mirror app "package_name"` - Mirror specific app

### Scripts

- `npm run dev` - Run in development mode with Raycast
- `npm run build` - Build the extension
- `npm run lint` - Lint the code
- `npm run fix-lint` - Fix linting issues

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Created by [@sameerasw](https://github.com/sameerasw)

## Links

- [AirSync Website](https://www.sameerasw.com/airsync)
- [Raycast Store](https://raycast.com)

---

Made with ❤️ for the AirSync community
