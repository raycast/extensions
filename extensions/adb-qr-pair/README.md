# ADB QR Pair

Pair and connect to an Android device over wireless debugging by scanning a QR code — no typing IP addresses or pairing codes.

## Requirements

- macOS or Windows
- [Android platform-tools](https://developer.android.com/tools/releases/platform-tools) (`adb`)
- Android 11+ with **Wireless debugging** enabled
- Phone and computer on the same Wi‑Fi network

## Usage

1. Open **ADB QR Pair** in Raycast.
2. On your phone: **Settings → Developer options → Wireless debugging → Pair device with QR code**.
3. Scan the QR code shown in Raycast.
4. When pairing succeeds, the device appears in `adb devices`.

Use **New QR Code** (⌘R on macOS, Ctrl+R on Windows) to generate a fresh code if the previous one expired or timed out.

## Preferences

- **ADB Path** — Full path to `adb` if auto-detect fails.
  - macOS: `/opt/homebrew/bin/adb` or `~/Library/Android/sdk/platform-tools/adb`
  - Windows: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
- **Pairing Timeout** — Seconds to wait for a scan (default: 60).

## Platform notes

### macOS

`adb` is auto-detected from Homebrew (`/opt/homebrew/bin/adb`) and the Android SDK. Bonjour (built in) handles mDNS discovery.

### Windows

`adb` is auto-detected from the Android SDK under `%LOCALAPPDATA%\Android\Sdk\platform-tools\`, `where adb`, or PowerShell. The extension enables adb’s embedded mDNS backend (`ADB_MDNS_OPENSCREEN`) when Bonjour is not installed.

If pairing times out after scanning:

1. Run `adb mdns check` in Command Prompt or PowerShell.
2. If mDNS is unavailable, install [Bonjour Print Services](https://support.apple.com/kb/DL999) (Apple Bonjour) and retry, or use manual `adb pair` / `adb connect` with the IP and ports from your phone’s **Wireless debugging** screen.

## Troubleshooting

- **adb not found** — Set **ADB Path** in extension preferences to the full path of `adb` / `adb.exe`.
- **Timed out waiting for scan** — Same Wi‑Fi; mDNS not blocked by guest/corporate networks.
- **Could not discover connect service** — Run `adb connect <ip>:<port>` using the connect port from **Wireless debugging** on the phone (not the pairing port).
