# Setup Guide

## Prerequisites

1. **Raycast**: Install from https://www.raycast.com
2. **Node.js**: Version 16 or higher
3. **Package Manager**: npm or pnpm

## Installation Steps

### 1. Install Dependencies

Using npm:
```bash
npm install
```

Or using pnpm (preferred):
```bash
pnpm install
```

### 2. Add Extension Icon

Create or download a 512x512 PNG icon and save it as:
```
assets/extension-icon.png
```

### 3. Update Author Info

Edit `package.json` and change:
```json
"author": "your-username"
```

### 4. Development Mode

Start the extension in development mode:
```bash
npm run dev
```

This will:
- Watch for file changes
- Automatically reload in Raycast
- Show build errors

### 5. Import in Raycast

1. Open Raycast
2. Search for "Import Extension"
3. Select this directory
4. The extension will appear in your commands

## Usage

### Interactive Styler

1. Press `⌘ + Space` (or your Raycast hotkey)
2. Type "Style Text with Unicode"
3. The extension will automatically load any selected text
4. Edit the text if needed
5. Browse styles with arrow keys
6. Press `Enter` to paste back to the active app
7. Or press `⌘ + C` to copy to clipboard

### Quick Commands with Hotkeys

1. Open Raycast Settings → Extensions → Style Text with Unicode
2. Find individual style commands (e.g., "Style as Bold")
3. Assign hotkeys to your favorite styles
4. Select text anywhere and press the hotkey for instant styling

## Recommended Hotkey Setup

Assign global hotkeys for frequently used styles:
- `⌥ + ⌘ + B` → Style as Bold
- `⌥ + ⌘ + I` → Style as Italic
- `⌥ + ⌘ + M` → Style as Monospace
- `⌥ + ⌘ + S` → Style as Script

## Publishing

To publish to the Raycast Store:

1. Ensure all metadata is correct in `package.json`
2. Add a proper icon
3. Test thoroughly
4. Run: `npm run publish`
5. Follow the Raycast store submission process

## Troubleshooting

### Extension not showing up
- Make sure you ran `npm install`
- Try restarting Raycast
- Check the Console in Raycast for errors

### "No text selected" error
- Make sure text is actually selected in another app
- Try using the interactive converter instead

### Styles not displaying correctly
- Some Unicode styles may not render in all fonts
- The converted text will work in most modern apps
- Try viewing in different apps if display issues occur

## Development Tips

- Use `npm run lint` to check for code issues
- Use `npm run fix-lint` to auto-fix linting issues
- Check Raycast's developer console for errors
- The extension reloads automatically in dev mode
