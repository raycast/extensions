# Application Manager

A Raycast extension for efficiently managing running GUI applications on macOS. Quickly view, select, and quit multiple applications with an intuitive interface.

## Features

- **View Running Applications**: See all visible GUI applications currently running on your Mac
- **Multi-Selection**: Select multiple applications using the spacebar
- **Bulk Actions**: Quit multiple selected applications at once
- **Smart Filtering**: Automatically filters out system applications for safety
- **Fast Performance**: Optimized with parallel processing and intelligent caching
- **Keyboard Shortcuts**: Full keyboard navigation support

## Usage

### Basic Operations
1. **Open the extension** from Raycast
2. **Browse applications** - All running GUI applications will be listed
3. **Select apps** - Press `Space` to select/deselect individual applications
4. **Quit selected apps** - Press `⌘ + Enter` to quit all selected applications

### Keyboard Shortcuts
- `Space` - Select/deselect individual app
- `⌘ + Enter` - Quit selected apps
- `⌘ + S` - Select all apps
- `⌘ + Shift + S` - Deselect all apps
- `⌘ + R` - Refresh the application list

### Safety Features
- **Confirmation Dialog**: Confirms before quitting multiple applications
- **System App Protection**: Prevents quitting essential system applications
- **Error Handling**: Graceful error handling with helpful messages
- **Web App Support**: Intelligent handling of browser windows and PWAs

## Requirements

- macOS (tested on macOS 14+)
- Raycast app
- **Accessibility Permissions**: Required for the extension to detect and quit applications

### Setting Up Accessibility Permissions

If you encounter permission errors:

1. Open **System Preferences** → **Privacy & Security** → **Accessibility**
2. Add **Raycast** to the list of allowed applications
3. Restart Raycast if needed

## Development

This extension is built with:
- TypeScript
- Raycast API
- AppleScript for system integration

## Contributing

Contributions are welcome! Please ensure any changes follow the established code style and include appropriate tests.

## License

MIT License - see the license file for details.
