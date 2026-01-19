# Brightness Control

Control macOS display brightness directly from Raycast.

## Features

- **Set Brightness**: Set display brightness to any level between 1-100
- **Show Brightness**: Display the current brightness level

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

### Set Brightness

1. Open Raycast (Cmd+Space)
2. Type "Set Brightness"
3. Enter a value between 1-100
4. Press Enter

### Show Brightness

1. Open Raycast (Cmd+Space)
2. Type "Show Brightness"
3. Press Enter to see the current brightness level

## License

MIT
