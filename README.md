# Brightness Control

Control macOS display brightness directly from Raycast.

## Features

- **Set Brightness**: View current brightness and set it to any level between 1-100
- Shows the brightness change (old → new) after setting

Works with all Mac displays including XDR/Liquid Retina displays.

## Prerequisites

This extension requires [Lunar](https://lunar.fyi/) to be installed:

```bash
brew install --cask lunar
```

After installing Lunar, install the CLI:

```bash
/Applications/Lunar.app/Contents/MacOS/Lunar install-cli
```

Lunar is free for basic brightness control.

## Installation

### Local Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. The extension will appear in Raycast

### From Raycast Store

_(Coming soon)_

## Usage

1. Open Raycast (Cmd+Space)
2. Type "Set Brightness"
3. The form will show your current brightness level
4. Enter a new value between 1-100
5. Press Enter to apply
6. A HUD notification will show the change (e.g., "☀️ 50% → 75%")

## License

MIT
