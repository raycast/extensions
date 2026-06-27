# QR Scanner for Raycast

Scan a QR code visible anywhere on your display and copy the decoded value to the clipboard.

## Install

```sh
npm install
npm run dev
```

Then run **Scan Display for QR Code** from Raycast.

## Notes

- This command is designed for Raycast on macOS and Windows.
- On macOS, it uses the built-in `screencapture` command.
- On Windows, it uses PowerShell and .NET screen capture APIs.
- The screenshot is decoded locally and deleted immediately after scanning.
