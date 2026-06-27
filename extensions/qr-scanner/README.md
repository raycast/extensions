# QR Scanner for Raycast

Scan QR codes visible anywhere on your display and instantly act on their contents.

## Features

- **Instant single scan** — capture the screen, decode one QR code, and copy to clipboard in one step.
- **Deep multi-scan** — detect multiple QR codes across the full display using region-based scanning.
- **Smart content detection** — automatically identifies URLs, emails, phone numbers, WiFi networks, vCards, SMS links, and map coordinates.
- **Contextual actions** — "Open in Browser" for URLs, "Compose Email" for emails, "Paste WiFi Password" for WiFi QR codes, and more.
- **Rescan** — press `⌘R` to rescan without reopening the command.

## Commands

| Command | Description |
|---------|-------------|
| **Scan Display for QR Code** | Quick scan for a single QR code — copies decoded content to clipboard. |
| **Scan Multiple QR Codes** | Deep scan for multiple QR codes — browse, search, and act on results. |

## Install

```sh
npm install
npm run dev
```

Then run **Scan Display for QR Code** or **Scan Multiple QR Codes** from Raycast.

## Limitations

- **Multi-code detection on Windows** — On Windows, QR decoding uses [jsQR](https://github.com/cozmo/jsQR), which decodes one symbol per image pass. The multi-scan command works around this with region-based tiling, but two QR codes placed very close together may not be isolated into separate tiles and one could be missed. On macOS, Apple's Vision framework handles multiple codes natively without this limitation.

## Notes

- This command is designed for Raycast on macOS and Windows.
- On macOS, it uses the built-in `screencapture` command.
- On Windows, it uses PowerShell and .NET screen capture APIs.
- The screenshot is decoded locally and deleted immediately after scanning.
