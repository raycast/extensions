# Brightness Control

Control macOS display brightness directly from Raycast.

## Features

- **Set Brightness**: View current brightness and set it to any level between 1-100
- Shows the brightness change (old → new) after setting

Works with all Mac displays including XDR/Liquid Retina displays.

## Prerequisites

This extension requires [Lunar](https://lunar.fyi/) to control display brightness.

**Good news!** The extension will guide you through the installation process if Lunar is not detected. It can even install the Lunar CLI automatically for you with one click.

### Manual Installation

If you prefer to install manually:

```bash
brew install --cask lunar
```

The extension will detect Lunar and offer to install the CLI automatically on first run.

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
3. **First time**: If Lunar is not installed, follow the guided setup
4. **After setup**: The form will show your current brightness level
5. Enter a new value between 1-100
6. Press Enter to apply
7. A HUD notification will show the change (e.g., "☀️ 50% → 75%")

## License

MIT
