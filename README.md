# Brightness Control

Control macOS display brightness directly from Raycast with smart multi-monitor support.

## Key Features

### Smart Display Detection
**Automatically detects and controls the display where your cursor is currently focused.** No need to manually select which monitor to adjust - the extension intelligently determines which display you're working on.

### Multi-Monitor Support
- Works seamlessly with multiple displays
- Manual display selection dropdown if you need to adjust a different screen
- Shows current brightness for each display independently
- Supports all Mac displays including XDR/Liquid Retina displays

### Visual Feedback
After setting brightness, you'll see a HUD notification showing the change with the display name (e.g., "☀️ Studio Display: 50% → 75%")

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

## Usage

1. Open Raycast (Cmd+Space)
2. Type "Set Brightness"
3. **First time**: If Lunar is not installed, follow the guided setup
4. **After setup**: The extension automatically selects the display where your cursor is located
5. View the current brightness for the selected display
6. (Optional) Use the dropdown to manually select a different display
7. Enter a new brightness value between 1-100
8. Press Enter to apply
9. A HUD notification shows the change with the display name

The extension uses retry logic and verification to ensure brightness changes are applied reliably.

## Installation

### Local Development

1. Clone this repository
2. Run `bun install` to install dependencies
3. Run `bun run dev` to start development mode
4. The extension will appear in Raycast

### From Raycast Store

_(Coming soon)_

## License

MIT
