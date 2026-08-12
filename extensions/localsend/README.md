# LocalSend for Raycast

<p align="center">
  <img src="assets/extension-icon.png" width="128" height="128" alt="LocalSend Logo">
</p>

<p align="center">
  <strong>Share files to nearby devices using LocalSend protocol</strong>
</p>

<p align="center">
  A Raycast extension that brings LocalSend's seamless file sharing to your command bar.
</p>

---

## ✨ Features

### 📤 **Send Files & Content**
- **Send Files** - Select and send any files to discovered devices
- **Send Media** - Quick access to send images and videos
- **Send Text** - Share text content instantly
- **Send Clipboard** - One-click clipboard sharing
- **Send Folder** - Share entire folders with a single command

### 📥 **Receive Files**
- **Auto-receive** - Server starts automatically when you open the Receive view
- **Pending Transfers** - Review and accept/reject incoming transfers when Quick Save is off
- **Smart Notifications** - See pending transfers in real-time
- **Organized Storage** - All files saved to your configured download folder

### 🔍 **Device Discovery**
- **Multicast Discovery** - Automatically find LocalSend devices on your network
- **Favorite Devices** - Star frequently used devices for quick access
- **Device Details** - See device type, model, IP, and connection status

### 📊 **Menu Bar Control**
- **Quick Save Settings** - Toggle between Off, Favorites, or Auto-accept modes
- **Device Information** - View your device details and local IPs
- **Quick Actions** - Fast access to all send commands
- **Status Indicator** - Custom LocalSend icon in your menu bar

---

## 🚀 Quick Start

### First Time Setup

1. **Install the extension** from Raycast Store
2. **Configure your device name** (optional, defaults to your computer name)
3. **Set download folder** (optional, defaults to ~/Downloads)

That's it! You're ready to share files.

### Sending Your First File

1. Open Raycast and type **"Send Files"**
2. Select files to send (supports multiple selection)
3. Choose the destination device from the list
4. Confirm and send!

### Receiving Files

**Automatic Mode** (Recommended):
- Simply open the **"Receive"** command
- The server starts automatically and stops when you close the view
- Files appear in the list as they're received

**Manual Approval Mode**:
- Set Quick Save to **"Off"** in the menu bar
- Incoming transfers appear in the "Pending Transfers" section
- Click ✓ to accept or ✗ to reject each transfer

---

## 📋 Commands

### Main Commands

| Command | Description | Shortcut Tip |
|---------|-------------|--------------|
| **Send** | Choose what to send (files, text, clipboard, etc.) | Quick launcher for all send options |
| **Discover Devices** | Find LocalSend devices on your network | See all available devices |
| **Receive** | View received files and pending transfers | Auto-starts receive server |
| **LocalSend Menu Bar** | Quick access to settings and actions | Always visible in menu bar |

### Send Commands

| Command | Use Case |
|---------|----------|
| **Send Files** | General file sharing |
| **Send Media** | Photos and videos |
| **Send Text** | Text snippets and notes |
| **Send Clipboard** | Current clipboard content |
| **Send Folder** | Entire directories |

---

## ⚙️ Settings

Access settings via `Cmd + ,` while in the extension.

### Essential Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Download Folder** | `~/Downloads` | Where received files are saved |
| **Quick Save** | `Off` | How to handle incoming transfers:<br>• **Off** - Ask for confirmation<br>• **Favorites** - Auto-accept from favorites<br>• **On** - Auto-accept from everyone |
| **Device Name** | Computer name | How your device appears to others |

### Advanced Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Device Type** | `Desktop` | Device category (Desktop, Mobile, Web, Headless) |
| **Device Model** | System info | Model shown to other devices |
| **HTTP Port** | `53318` | Port for receiving files (53317 used by LocalSend app) |
| **Multicast Address** | `224.0.0.167` | Discovery multicast group |
| **Discovery Timeout** | `5 seconds` | How long to wait for device responses |
| **Network Interface** | All interfaces | Specific interface to use (leave empty for all) |
| **Enable Encryption** | `Disabled` | HTTPS for transfers (experimental) |

---

## 💡 Tips & Tricks

### Quick Save Modes

**Off (Default)**
- Best for security-conscious users
- You manually approve each transfer
- Pending transfers appear in the Receive view

**Favorites Only**
- Auto-accept from starred devices
- Reject all others automatically
- Perfect balance of security and convenience

**On (Auto-accept)**
- Fastest workflow
- All transfers accepted immediately
- Use only on trusted networks

### Menu Bar Quick Actions

Right-click the menu bar icon for:
- Quick Send Files/Media/Text/Clipboard/Folder
- Discover Devices
- Change Quick Save mode
- View device information and local IPs

### Favorite Devices

In the Discover Devices view:
- Press `Cmd + F` to star/unstar a device
- Favorited devices appear at the top of all lists
- Combine with "Favorites" Quick Save mode for trusted devices

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Favorite | `Cmd + F` |
| Refresh Devices | `Cmd + R` |
| Copy Device IP | `Cmd + .` |

---

## 🔧 Troubleshooting

### Devices Not Showing Up

1. **Check network** - Ensure both devices are on the same local network
2. **Check firewall** - Allow incoming connections on port 53318
3. **Restart discovery** - Close and reopen Discover Devices command
4. **Check preferences** - Verify "Enable Discovery" is checked

### Cannot Receive Files

1. **Open Receive view** - Server starts automatically when you open it
2. **Check Quick Save** - Set to "On" for testing, then adjust as needed
3. **Verify port** - Ensure port 53318 isn't blocked by firewall
4. **Check download folder** - Ensure the path exists and is writable

### Port Conflicts

If you're running the official LocalSend app:
- LocalSend app uses port **53317**
- This extension uses port **53318** by default
- Both can run simultaneously without conflicts

Change the port in preferences if you encounter other conflicts.

---

## 🔐 Security & Privacy

- **Local Network Only** - All transfers happen over your local network
- **No Internet Required** - Files never leave your network
- **No Cloud Storage** - Direct device-to-device transfer
- **Manual Approval** - Review transfers before accepting (when Quick Save is Off)
- **Favorites System** - Trust specific devices for auto-acceptance

---

## 🤝 Compatibility

### Works With
- ✅ Official LocalSend apps (Android, iOS, macOS, Windows, Linux)
- ✅ Multiple LocalSend Raycast extensions simultaneously
- ✅ Any device supporting LocalSend Protocol v2

### Network Requirements
- Same local network (WiFi or Ethernet)
- Multicast support (enabled on most home/office networks)
- No VPN interference

---

## 📚 Learn More

- **LocalSend Official Site**: [localsend.org](https://localsend.org)
- **LocalSend Protocol**: [github.com/localsend/protocol](https://github.com/localsend/protocol)
- **Report Issues**: [github.com/raycast/extensions](https://github.com/raycast/extensions)

---

## 🙏 Credits

Built with ❤️ for the Raycast community.

- **LocalSend Protocol** by the LocalSend team
- **Extension** by [kud](https://github.com/kud)

---

<p align="center">
  <sub>Made for Raycast • Share files at the speed of thought</sub>
</p>