# Screenshots Plugin for Raycast

[中文文档](README.md) | English

A Raycast extension that allows you to quickly capture screenshots and display them in a floating window with OCR text recognition support.

## Features

- 🖼️ **Quick Screenshot**: Invoke macOS screenshot tool instantly
- 📺 **Floating Window**: Display screenshots in a 1:1 ratio floating window
- 🔤 **OCR Text Recognition**: Automatic text recognition (supports Chinese and English)
- 📋 **Copy & Paste**: One-click copy or paste recognized text
- 🖱️ **Click-Through**: Image area is fully transparent to clicks, doesn't interfere with underlying apps
- 🔝 **Always on Top**: Window stays on top of all other windows
- 🖱️ **Draggable**: Move the window anywhere on screen
- ⌨️ **ESC to Close**: Press ESC key to close the floating window
- 🧹 **Auto Cleanup**: Automatically removes temporary files

## Installation

### From Raycast Store (Recommended)
1. Open Raycast
2. Search for "Screenshots Plugin"
3. Click Install

### Manual Installation
1. Clone or download this repository
2. Open Raycast Settings
3. Go to Extensions tab
4. Click "Add Extension"
5. Select this project directory

## Usage

1. Open Raycast and search for "Take Screenshot"
2. Execute the command to invoke macOS screenshot tool
3. Select the area you want to capture
4. The screenshot will appear in a floating window
5. If text is detected, click the OCR button to view recognized text
6. Press ESC to close the window

## Development

```bash
# Install dependencies
npm install

# Compile native floating window application (required)
./build-native.sh

# Development mode
npm run dev

# Build
npm run build
```

## Technical Details

- Uses macOS `screencapture` command for screenshots
- Native Objective-C application for floating window (`float-window`)
- Click-through support (`ignoresMouseEvents = YES`)
- Always on top (`NSFloatingWindowLevel`)
- 1:1 image display without scaling
- Image area is fully click-through (doesn't interfere with underlying apps)
- 10px edge area for dragging the window
- Press ESC to close the window
- Integrated Apple Vision Framework for OCR

## Requirements

- macOS 11.0 or later
- Raycast 1.60.0 or later

## License

MIT

## Author

**ChaosYoung**
- Email: saber97792@gmail.com
- GitHub: [@chaosyoung97](https://github.com/chaosyoung97)

## Contributing

Issues and pull requests are welcome!

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
