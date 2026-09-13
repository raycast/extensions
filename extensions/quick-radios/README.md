# Quick Radios - Raycast Extension

Control your **Wi-Fi** and **Bluetooth** connections directly from the Raycast search window without digging through settings or system flyouts.

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Quick Radios Icon" />
</p>

## ✨ Features

### 📶 Manage Wi-Fi (`wifi`)
- **4-Tier Network Sections**:
  1. **Connected Wi-Fi Network**: Currently active connection with live IP, MAC, gateway, and high-res status badge.
  2. **Saved and in Range**: Saved profiles currently broadcasting nearby with 1-click reconnect.
  3. **In Range**: Available nearby broadcast networks with password prompts.
  4. **Saved but Not in Range**: Saved profiles that are not currently detected nearby.
- **Active Hardware Scanning**: Commands the Wi-Fi card to broadcast 802.11 active probe scans (via `wlanapi.dll` `WlanScan`), ensuring newly broadcasting hotspots and networks appear live without OS caching stalls.
- **Two-Pane Detail View**: Inspect IP address, MAC address, default gateway, and encryption type directly beside the list.
- **1-Click Connect**: Instantly reconnect to any of your saved/known Wi-Fi networks.
- **Join New Networks**: Scan nearby networks and connect with a secure password prompt.
- **Share Wi-Fi via QR Code**: Automatically generate phone-scannable QR codes and retrieve cleartext passwords for saved networks.
- **Radio Toggle**: Turn Wi-Fi radio on/off without needing administrator rights.
- **Copy Shortcuts**: Rapidly copy IP address (`Cmd/Ctrl + C`), MAC address, or gateway to clipboard.

### ᛒ Manage Bluetooth (`bluetooth`)
- **Paired Devices Dashboard**: See all paired Bluetooth devices categorized into **Audio & Headphones**, **Keyboards, Mice & Controllers**, and **Other Paired Devices**.
- **Live Connection State**: Instantly see which devices are currently connected (🟢) vs paired/disconnected (⚪).
- **1-Click Connect / Disconnect**: Toggle connection state for audio headsets and peripherals.
- **Radio Toggle**: Turn Bluetooth on/off directly from search (`Cmd/Ctrl + T`).
- **Pair New Devices**: Quick shortcut to launch OS Bluetooth pairing settings (`Cmd/Ctrl + O`).

### ⚡ Instant Quick Toggles (No-View Commands)
- **Toggle Wi-Fi** (`toggle-wifi`): One-shot command to toggle Wi-Fi radio with a HUD notification.
- **Toggle Bluetooth** (`toggle-bluetooth`): One-shot command to toggle Bluetooth radio with a HUD notification.

---

## ⌨️ Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Connect / Disconnect** | `Enter` |
| **Toggle Radio (On / Off)** | `Cmd/Ctrl + T` |
| **Copy Wi-Fi Password** | `Cmd/Ctrl + Shift + P` |
| **Copy IP / MAC Address** | `Cmd/Ctrl + C` |
| **Open System Settings** | `Cmd/Ctrl + O` |
| **Refresh List** | `Cmd/Ctrl + R` |

---

## 🖥️ Platform Support

- **Windows 10 / 11**: Fully supported using native PowerShell WinRT Radios and `netsh` (no external binaries or admin privileges required).
- **macOS**: Supported using native `networksetup` and `blueutil`.

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start extension in development mode
npm run dev

# Run type check and lint
npm run lint

# Build extension
npm run build
```

