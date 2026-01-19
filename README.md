# Brightness Control

Control macOS display brightness directly from Raycast.

## Features

- **Set Brightness**: Set display brightness to any level between 1-100
- **Show Brightness**: Display the current brightness level

## Prerequisites

### 1. Install brightness tool

```bash
brew install brightness
```

### 2. Grant Raycast Permissions

For brightness control to work, Raycast needs permissions:

1. Open **System Settings** → **Privacy & Security**
2. Grant Raycast access to:
   - **Accessibility** (required for XDR displays)
   - **Screen Recording** (may be needed)

**Note for XDR Display Users**: The standard `brightness` tool may not work with XDR displays (Liquid Retina XDR). If you encounter errors, consider using:
- [BetterDisplay](https://github.com/waydabber/BetterDisplay) (recommended)
- [Lunar](https://lunar.fyi/)

These apps provide better XDR display support and can be controlled via CLI or Raycast extensions.

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
