# Quick Radios - Raycast Extension

A **Windows Wi-Fi manager** for Raycast. Scan, join, share, and inspect Wi-Fi networks from the Raycast search window without opening the Windows quick settings flyout or the Settings app.

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Quick Radios Icon" />
</p>

## Why Windows

Quick Radios is scoped to Raycast for Windows and does not run on macOS. It is built entirely on Windows-native APIs:

- `netsh wlan` for interfaces, profiles, connection, and saved-password lookup
- The WLAN API (`WlanScan`) for active hardware scans, so newly broadcasting hotspots appear without waiting on the OS cache
- The WinRT `Windows.Devices.Radios` API for turning the Wi-Fi radio on or off without administrator rights

## ✨ Features

### 📶 Manage Wi-Fi (`wifi`)
- **Network Sections**:
  1. **Connected Wi-Fi Network**: The active connection with IP, MAC, gateway, and signal details.
  2. **Saved and in Range**: Saved profiles broadcasting nearby, with 1-click reconnect.
  3. **In Range**: Nearby networks, with a password prompt for secured networks.
  4. **Saved but Not in Range**: Saved profiles that are not currently detected.
- **Detail View**: IP address, MAC address, default gateway, band, channel, radio standard, and encryption beside the list.
- **Join New Networks**: Connect to WPA2/WPA3-Personal and open networks with a password prompt.
- **Share via QR Code**: Generate a phone-scannable QR code locally and copy the saved password.
- **Internet Speed & Session Data**: Run a speed test and see data transferred during the current connection.
- **Forget Network**: Remove a saved Wi-Fi profile.
- **Radio Toggle**: Turn the Wi-Fi radio on or off without administrator rights.

### ⚡ Toggle Wi-Fi (`toggle-wifi`)
- One-shot command that toggles the Wi-Fi radio and confirms with a HUD notification.

---

## ⌨️ Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Connect / Disconnect** | `Enter` |
| **Toggle Wi-Fi Radio** | `Ctrl + T` |
| **Copy Wi-Fi Password** | `Ctrl + Shift + P` |
| **Copy IP Address** | `Ctrl + C` |
| **Test Internet Speed** | `Ctrl + Shift + S` |
| **Open Wi-Fi Settings** | `Ctrl + O` |
| **Refresh List** | `Ctrl + R` |

---

## 🖥️ Platform Support

- **Windows 10 / 11** only. No administrator privileges required.

### Location access (Windows 11 24H2 and later)

Windows treats nearby Wi-Fi networks and the connected network name as location data. With Location access off, `netsh wlan` refuses to list networks or report the current connection, so **Manage Wi-Fi** shows a *Location Access Required* screen instead of the network list. To enable it:

1. Open **Settings → Privacy & security → Location** (or press Enter on *Open Location Settings* in the extension).
2. Turn on **Location services**.
3. Turn on **Let desktop apps access your location**.

The list reloads on its own within a few seconds. **Toggle Wi-Fi** does not need Location access.

The bundled `assets/quick-radios-helper.exe` is compiled from [`assets/quick-radios-helper.cs`](assets/quick-radios-helper.cs). It only triggers WLAN scans and reads or sets the Wi-Fi radio state. If the helper is unavailable, the extension falls back to equivalent PowerShell WinRT calls.

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start extension in development mode
npm run dev

# Run type check and lint
npm run lint

# Run unit tests
npm test

# Run live checks against the local Wi-Fi adapter
npm run test:integration:windows

# Build extension
npm run build
```

### Rebuilding the helper

```powershell
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /optimize+ /target:exe `
  /out:assets\quick-radios-helper.exe `
  /r:C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.dll `
  /r:C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.WindowsRuntime.dll `
  "/r:C:\Program Files (x86)\Windows Kits\10\UnionMetadata\10.0.26100.0\Windows.winmd" `
  assets\quick-radios-helper.cs
```
