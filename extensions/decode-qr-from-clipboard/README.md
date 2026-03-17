# Clipboard QR Decoder

This Raycast extension reads an image with a QR code from the macOS clipboard, decodes the first QR code it finds, and copies the decoded value back to the clipboard as plain text.

## How it works

1. Copy an image containing a QR code to the clipboard.
2. Run `Decode QR from Clipboard` in Raycast.
3. The command extracts the image, decodes the first QR code, and replaces the clipboard contents with the decoded text.
4. If the decoded result is a URL, you can open it from the action panel.

## Release Notes

- Uses macOS-native `osascript` and AppKit at runtime, so the command does not depend on Xcode Command Line Tools.
- Shows guided loading, success, and error states in the root command view.
- Provides quick actions to copy the result again or open a decoded URL in the browser.

## Current limitations

- Version 1 supports macOS only.
- The command expects an image in the clipboard.
- If the image contains multiple QR codes, only the first detected value is used.
- If no image or no QR code is found, the command shows an error toast and leaves the clipboard unchanged.