# PSE Tools

A Raycast extension with useful tools for QM PSEs.

## Commands

### My IP
Gets and copies your public IPv4 address to the clipboard.

### Sub Info
Fetches and displays subscription information from QMOPS2. The extension now includes intelligent caching:

- **Automatic Caching**: Sub records are cached locally and only refreshed when the session cookie changes
- **Manual Refresh**: Use `Cmd+R` to manually refresh the sub list
- **Cache Management**: Use `Cmd+Shift+Delete` to clear the cache
- **Smart Detection**: The extension automatically detects when you update your PHPSESSID cookie

## Setup

1. Set your PHPSESSID cookie in the extension preferences
2. The extension will automatically fetch and cache your sub list
3. Update your cookie in preferences when needed - the extension will detect the change and refresh automatically

## Features

- **Persistent Cache**: No need to update the cookie every time you run the command
- **Cookie Change Detection**: Automatically refreshes when the session cookie is updated
- **Fallback Support**: Uses cached data if the API is unavailable
- **Quick Actions**: Keyboard shortcuts for common operations