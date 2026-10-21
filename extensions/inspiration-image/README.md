# Inspiration Image

A macOS Raycast extension that places selected text or a clipboard screenshot over a background image. It composes everything locally; your text and screenshots are not sent to an image service.

## Use the Extension

1. Select text in any app and run **Add Background to Selected Text**, or copy a screenshot and run **Add Background to Clipboard Screenshot**.
2. Choose one of four built-in memo backgrounds or select a custom image.
3. Preview the composition in Raycast. The result is kept temporarily in the system temp directory.
4. Choose whether to save it to `~/Pictures/Inspiration Images`, import it to Apple Photos, or share it with the macOS share sheet.

## Custom Background Requirements

- PNG, JPG/JPEG, or HEIC.
- At least 1024 × 1024 pixels and no larger than 20 MB.
- Square images are recommended. Other aspect ratios are center-cropped to fill the square canvas.
- Custom backgrounds are read locally and are not uploaded.

## Develop Locally

1. Install Node.js, Raycast, and Xcode Command Line Tools.
2. Run `npm install`.
3. Run `npm run build` to create a distribution build, or `npm run dev` to load the extension in Raycast.

The native bridge is built from `native/main.swift` by `scripts/build-native.sh` as a universal macOS binary for Apple silicon and Intel, targeting macOS 13 or later. The source and build script are included so the binary can be reproduced. The checked-in helper lets non-macOS build environments package the extension without requiring Swift or AppKit.

## Privacy

- Selected text, clipboard screenshots, and custom backgrounds are processed locally. No image generation service or analytics is used.
- Preview files are temporary and may be removed by macOS. Choosing **Save to Pictures** creates a persistent copy.
- Importing to Apple Photos may require allowing Raycast to control Photos in System Settings → Privacy & Security → Automation.
