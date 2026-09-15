# Windows Screenshot Raycast Extension

A Windows-native screenshot extension for [Raycast](https://www.raycast.com), providing fast, keyboard-driven screen capture capabilities on Windows 10 and 11.

![Extension Icon](icon.png)

## Features

- **Capture Screen**: Instantly captures the entire screen across single or multi-monitor setups.
- **Capture Region**: Interactive full-screen selection overlay with real-time dimension indicators (`W × H px`), blue selection border, and `ESC` or right-click cancellation.
- **Capture Window**: Captures the active foreground window using Win32 DWM frame APIs, excluding invisible drop-shadow margins.
- **Extract Text (OCR)**: Native Windows WinRT OCR engine extracts text locally and offline from screen captures or image files directly into your clipboard.
- **Flexible Output**: Configure output to Save to disk, Copy image directly to the clipboard, or both simultaneously (`Save + Copy`).
- **High-DPI & Multi-Monitor**: Fully DPI-aware coordinate calculation matching actual screen resolution.
- **Zero External Dependencies**: Powered natively by Windows GDI32, Win32 APIs, WinRT OCR, and .NET Framework built into Windows.

---

## Commands

| Command | Description | Mode |
| :--- | :--- | :--- |
| **Capture Screen** | Capture a screenshot of the entire screen | `no-view` |
| **Capture Region** | Select a rectangular area of the screen to capture | `no-view` |
| **Capture Window** | Capture the currently active foreground window | `no-view` |
| **Extract Text** | Extract text from an image or screenshot using local Windows OCR | `view` |

---

## Preferences

You can customize the extension behavior in Raycast Preferences (`Cmd/Ctrl + ,`):

| Preference | Type | Default | Options / Details |
| :--- | :--- | :--- | :--- |
| **Screenshot Output** | Dropdown | `Save + Copy` | `Save + Copy`, `Save`, `Copy` |
| **Screenshot Save Location** | Directory | `~/Pictures/Screenshots` | Directory path to save image files |

### Save Location Path Expansion

The save location supports standard Windows path conventions:
- Tilde expansion: `~/Pictures/Screenshots`
- Environment variables: `%USERPROFILE%\Pictures\Screenshots`
- Custom absolute paths: `C:\Users\YourName\Desktop`

If the destination directory does not exist, it will be created automatically.

### File Naming Convention

Screenshots are saved using the timestamp format:

```text
Screenshot YYYY-MM-DD HH-mm-ss.png
```

*Example:* `Screenshot 2026-08-11 13-42-18.png`

If a file collision occurs, unique index suffixes are automatically appended (e.g. `Screenshot 2026-08-11 13-42-18 (1).png`).

---

## Technical Architecture

This extension uses a native Windows execution engine:

- **GDI32 BitBlt & User32**: Used for pixel-perfect frame grabbing from screen device contexts (`GetDC`, `BitBlt`).
- **Desktop Window Manager (DWM)**: `DwmGetWindowAttribute` with `DWMWA_EXTENDED_FRAME_BOUNDS` is used to capture visible window bounds cleanly without transparent shadow margins.
- **WinForms Overlay Engine**: Interactive region capture utilizes a borderless full-screen form showing a pre-captured desktop image with a dimmed translucent mask (`Color.FromArgb(120, 0, 0, 0)`), blue bounding box, and dimensions badge.
- **Windows Clipboard (`System.Windows.Forms.Clipboard`)**: Writes native DIB/Bitmap image data directly to the clipboard, making it instantly pastable into applications like Paint, Discord, Slack, Photoshop, and web forms.

---

## Development & Contribution

### Prerequisites

- Node.js (v18 or higher)
- Raycast for Windows

### Build & Test Commands

```bash
# Install dependencies
npm install

# Start extension in development mode
npm run dev

# Lint source code & metadata
npm run lint

# Build production bundle
npm run build
```

---

## License

[MIT](LICENSE)
