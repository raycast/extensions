# Chrome Profile Manager

A powerful Raycast extension for managing Google Chrome profiles, browsing history, and open tabs with lightning-fast search capabilities.

## Features

### Profile Management

- **Quick Profile Switching**: Open any Chrome profile directly from Raycast
- **Profile Search**: Search profiles by name or associated Google account email
- **Custom URL Launch**: Open profiles with a specific URL

### History Search

- **Browse History**: Search through your browsing history for each profile
- **Smart Search**: Debounced search with support for both URL and title matching
- **Quick Navigation**: Press Tab to instantly open URLs or search Google

### Tab Management

- **Search All Tabs**: Find any open tab across all Chrome windows
- **Instant Switch**: Jump to any tab with a single keystroke
- **Tab Actions**: Reload, close, or open tabs in guest windows

### Smart URL Handling

- **Automatic URL Detection**: Type any URL and press Tab to open it
- **Google Search Integration**: Non-URL queries automatically search Google
- **Domain Support**: Recognizes domains without protocols (e.g., `github.com`)

## How to Use

### Opening Profiles

1. Launch the extension via Raycast
2. Browse or search for your Chrome profile
3. Press `Enter` to open the profile
4. Or press `Shift + Enter` to view browsing history

### Searching History

1. Open a profile's history with `Shift + Enter`
2. Type to search URLs and page titles (300ms debounce)
3. When you type something:
   - If it looks like a URL: Press `Enter` to open it
   - If it's a search query: Press `Enter` to search Google
4. Press `Enter` on any history item to open it

### Managing Tabs

1. From any profile, press `Shift + Tab` to search tabs
2. Type to filter across all open tabs
3. Press `Enter` to switch to the tab

## Keyboard Shortcuts

| Shortcut        | Action                            |
| --------------- | --------------------------------- |
| `Enter`         | Open profile / Open selected item |
| `Shift + Enter` | Show browsing history             |
| `Shift + Tab`   | Search open tabs                  |

## Requirements

- Google Chrome must be installed
- macOS (uses AppleScript for Chrome automation)

## Privacy

All searches and operations are performed locally. No data is sent to external servers except when using the Google search feature.
