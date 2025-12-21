# Hashcat Modes

A Raycast extension that allows you to quickly search for hashcat modes with hash names, examples, and hash modes. Perfect for security professionals and penetration testers who need to quickly look up hashcat mode information.

## Features

- 🔍 **Fast Search**: Search hashcat modes by hash name, hash mode number, or example hash
- 📋 **Quick Copy**: Copy hashcat mode numbers, hash names, or example hashes to clipboard with a single click
- 🔄 **Auto-Update**: Automatically fetches the latest hashcat documentation from the official repository
- ⚡ **Instant Results**: Real-time filtering as you type
- 📊 **Comprehensive Data**: Includes all hashcat modes with their associated information

## Installation

1. Install [Raycast](https://raycast.com/) if you haven't already
2. Open Raycast and navigate to Extensions
3. Search for "Hashcat Modes" or install this extension manually
4. The extension will be available in your Raycast command palette

## Usage

1. Open Raycast (default: `Cmd + Space` on macOS)
2. Type "Hashcat Modes Search" or use the command shortcut
3. Start typing to search for:
   - Hash names (e.g., "MD5", "SHA256", "bcrypt")
   - Hash mode numbers (e.g., "0", "1000", "3200")
   - Example hashes
4. Select a result to view details
5. Use the action panel to copy:
   - Hashcat mode number
   - Hash name
   - Example hash

### Data Source

The extension pulls data from:
```
https://raw.githubusercontent.com/hashcat/hashcat/master/docs/hashcat-example-hashes.md
```

This ensures you always have access to the latest hashcat modes as they're added to the official documentation.

## License

MIT

## Author

unkatreus