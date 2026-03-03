# QR Cam

Scan QR codes directly from your Mac webcam in Raycast.

## Requirements

- You must have `Xcode` installed, or at least `Xcode Command Line Tools (CLT)`.
- This extension compiles a Swift helper on first launch.
- Without Xcode/CLT available on your machine, the extension will not work.

## Features

- Native scanner for Mac (Swift + AVFoundation + Vision).
- Fully offline scanning (no browser flow, no external service).
- Automatic content typing after scan:
  - Wi-Fi QR code
  - HTTP/HTTPS URL
  - Other text payload
- Contextual actions based on detected content type.

## Command

- `Scan QR Code with Camera` (`scan-a-qr-code`)

## Scan Flow

1. Run `Scan QR Code with Camera` from Raycast.
2. The scanner starts automatically (or press Enter to start it manually).
3. Grant camera permission if prompted.
4. Point the webcam at a QR code.
5. The result is sent back to Raycast and rendered with type-aware details.

## Content Type Detection

The extension parses the decoded payload in this order:

1. **Wi-Fi**
2. **URL (`http` / `https`)**
3. **Other**

### 1) Wi-Fi detection

Recognized format starts with `WIFI:` and supports standard fields:

- `S:` SSID (required)
- `P:` Password (optional)
- `T:` Security type (optional, e.g. `WPA`, `WEP`, `nopass`)
- `H:` Hidden flag (optional: `true` / `1`)

Example:

```text
WIFI:T:WPA;S:MyNetwork;P:super-secret;H:false;;
```

Escaped characters are supported in values (for example `\;`, `\:`, `\\`).

### 2) URL detection

If payload is not Wi-Fi, it is tested as a URL.  
Only `http://` and `https://` URLs are considered valid URL type.

### 3) Other

Any payload that does not match Wi-Fi or HTTP/HTTPS URL is treated as generic text.

## Actions by Content Type

### Wi-Fi QR code

- `Connect to Wi-Fi Network`: runs native macOS networking command (`networksetup`) with scanned credentials.
- `Start Scanner`: scan a new QR code.
- `Copy Result`: copy raw QR payload.
- `Reset`: clear current result.

### URL QR code

- `Open URL`: open the scanned URL in browser.
- `Start Scanner`: scan a new QR code.
- `Copy Result`: copy raw QR payload.
- `Reset`: clear current result.

### Other text QR code

- `Start Scanner`: scan a new QR code.
- `Copy Result`: copy raw QR payload.
- `Reset`: clear current result.

## Requirements

- macOS (uses native camera APIs and native scanner binary).
- Camera permission granted to the scanner app window.
- Raycast installed.