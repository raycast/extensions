# Uninstall App Raycast Extension

A Raycast extension that helps you completely uninstall macOS applications by removing:

- The application itself
- All related support files
- Preferences and settings
- Cached data

## Features

- Lists all installed applications from /Applications
- Scans for related files in common locations:
  - Application Support
  - Preferences
  - Caches
  - Saved Application State
  - Containers
  - Receipts
- Shows total size of files to be removed
- Allows selective uninstallation
- Uses administrator privileges when needed

## Usage

1. Open the extension
2. Select an application to uninstall
3. Review the list of files to be removed
4. Confirm the uninstallation

The extension will:

1. Remove the application
2. Delete all related files
3. Clean up preferences and caches

## Preferences

- **Debug Mode**: Enable debug logging (development only) - shows detailed console output prefixed with [Debug]

## Requirements

- macOS
- Raycast

## Installation

1. Install the extension from the Raycast Store
2. Grant necessary permissions when prompted

## Development

To build and run the extension locally:

```bash
npm install
npm run dev
```

## License

MIT
