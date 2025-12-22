# Raycast Kitty Tabs

List and activate Kitty terminal tabs directly from Raycast.

## Features

- 📋 List all Kitty terminal tabs across all windows and instances
- 🔍 Search and filter tabs by title, directory, or process name
- ⚡ Quick activation with keyboard shortcuts
- 📁 Shows current working directory and running process
- 🪟 Grouped by window for easy navigation
- ✅ Visual indicators for active tabs
- 📋 Copy working directory or tab title to clipboard

## Requirements

- [Raycast](https://raycast.com/) 1.26.0 or higher
- [Kitty](https://sw.kovidgoyal.net/kitty/) terminal emulator
- macOS or Linux

## Installation

1. Clone this repository or download the source code
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Install the extension in Raycast:
   ```bash
   npm run dev
   ```

## Configuration

### Enable Kitty Remote Control

While not strictly required for basic functionality, enabling Kitty's remote control provides better integration:

Add this to your `~/.config/kitty/kitty.conf`:

```bash
# Enable remote control
listen_on unix:$HOME/.local/share/kitty/kitty-socket

# Optional: Set a custom socket path
# listen_on unix:/tmp/kitty-socket
```

After adding this configuration, restart Kitty.

## Commands

### List Kitty Tabs
Lists all Kitty terminal tabs grouped by window.

**Shortcut:** `kitty list`

### Query Kitty Tabs
Query and search all Kitty terminal tabs with real-time filtering.

**Features:**
- Search by title, directory, or process name
- Sort by active status (active tabs appear first)
- Keyboard shortcuts (Cmd+K to refresh, Cmd+Enter to focus first result)
- Quick actions for copying and focusing tabs

**Shortcut:** `kitty query`

## Usage

### Using List Tabs Command

1. Press `⌘+K` (or your configured Raycast shortcut) to open Raycast
2. Type `kitty list` to find the extension
3. Use arrow keys to navigate through tabs
4. Press `Enter` to activate the selected tab
5. Use `⌘+K` to refresh the list

### Using Query Tabs Command

1. Press `⌘+K` to open Raycast
2. Type `kitty query` to search tabs
3. Start typing to filter tabs in real-time
4. Press `Cmd+Enter` to focus the first result
5. Or select a specific tab and press `Enter`

### Keyboard Shortcuts

- `↑/↓`: Navigate between tabs
- `Enter`: Activate selected tab
- `⌘+K`: Refresh tab list (both commands)
- `⌘+Enter`: Focus first result (Query tabs only)
- `⌘+Shift+C`: Copy working directory
- `⌘+Shift+T`: Copy tab title

### Actions

- **Activate Tab**: Switch to the selected tab
- **Focus Window**: Focus the window containing the tab
- **Copy Working Directory**: Copy the tab's current directory
- **Copy Tab Title**: Copy the tab's title
- **Copy Tab Info**: Copy all tab information
- **Refresh**: Reload all tabs from Kitty

## Development

### Project Structure

```
raycast-kitty-tabs/
├── src/
│   ├── commands/
│   │   └── listTabs.ts       # Main command
│   ├── components/
│   │   ├── TabList.tsx       # Tab list UI
│   │   └── TabItem.tsx       # Individual tab UI
│   ├── utils/
│   │   ├── kittyAPI.ts       # Kitty API integration
│   │   ├── cache.ts          # Caching utilities
│   │   └── errorHandler.ts   # Error handling
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── index.ts              # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

- `npm run dev`: Run the extension in development mode
- `npm run build`: Build the extension for production
- `npm run lint`: Lint the code
- `npm run format`: Format the code with Prettier

### Testing

To test the Kitty integration manually:

```bash
# Check if kitty is available
which kitty

# List kitty instances
kitty +kitten ls

# Get active tab
kitty +kitten get-active-tab
```

## Troubleshooting

### "Kitty not found" error

Make sure Kitty terminal is installed and available in your PATH:
```bash
# Install Kitty (macOS)
brew install --cask kitty

# Or download from: https://sw.kovidgoyal.net/kitty/
```

### No tabs showing

1. Make sure Kitty terminal is running
2. Try refreshing the list with `⌘+K`
3. Check that tabs are actually open in Kitty

### "Failed to activate tab" error

1. Ensure the tab still exists (it may have been closed)
2. Try focusing the window first, then activating the tab
3. Check that Kitty has proper permissions

### Performance issues

The extension caches tab lists for 1 second to improve performance. If you need real-time updates, press `⌘+K` to refresh.

## Technical Details

### Kitty API Integration

This extension uses Kitty's built-in `ls` and `activate-tab` kittens:

- `kitty +kitten ls`: Lists all windows and tabs
- `kitty +kitten activate-tab`: Activates a specific tab
- `kitty +kitten focus-window`: Focuses a specific window

### Caching Strategy

- Tab lists are cached for 1 second
- Cache is automatically cleared on refresh
- Helps reduce API calls and improve performance

### Error Handling

- Comprehensive error messages for common issues
- Validates Kitty availability before operations
- Graceful degradation when features are unavailable

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- [Raycast](https://raycast.com/) for the amazing productivity platform
- [Kitty](https://sw.kovidgoyal.net/kitty/) for the fast terminal emulator
- The open-source community for inspiration and tools
