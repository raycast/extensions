# Quick Start Guide

Get up and running with Raycast Kitty Tabs in minutes!

## Prerequisites

1. **Install Raycast** (if not already installed)
   - Download from [raycast.com](https://raycast.com/)
   - Minimum version: 1.26.0

2. **Install Kitty Terminal**
   ```bash
   # macOS (using Homebrew)
   brew install --cask kitty

   # Linux
   curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh
   ```

## Installation

### Step 1: Clone and Setup

```bash
# Clone or download this project
cd raycast-kitty-tabs

# Install dependencies
npm install
```

### Step 2: Build the Extension

```bash
# Build the TypeScript code
npm run build
```

### Step 3: Install in Raycast

```bash
# Run the extension in development mode
# This will install it in Raycast
npm run dev
```

### Step 4: Configure Kitty (Optional but Recommended)

Add this to your `~/.config/kitty/kitty.conf`:

```bash
listen_on unix:$HOME/.local/share/kitty/kitty-socket
```

Restart Kitty after adding this configuration.

## Testing

### Test Kitty Integration

```bash
# Run the test script
node test-kitty.js
```

Expected output:
```
✅ Kitty found at: /path/to/kitty
✅ Kitty ls command succeeded
✅ Get-active-tab command succeeded
✅ Activate-tab command exists
```

### Test in Raycast

1. Press `⌘+K` (or your Raycast hotkey)
2. Type `kitty`
3. You should see the "Kitty Tabs" command

## Usage

### Basic Usage

1. Open Raycast (`⌘+K`)
2. Type `kitty`
3. Select "Kitty Tabs"
4. Browse your tabs
5. Press `Enter` to activate

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑/↓` | Navigate tabs |
| `Enter` | Activate tab |
| `⌘+K` | Refresh list |
| `⌘+Shift+C` | Copy working directory |
| `⌘+Shift+T` | Copy tab title |

### Common Tasks

**Search for a specific tab:**
- Just start typing while the list is open

**Copy a directory path:**
- Select the tab
- Press `⌘+Shift+C`

**Focus a window without activating a tab:**
- Use the "Focus Window" action in the menu

## Troubleshooting

### "Kitty not found" Error

**Problem:** Raycast shows "Kitty not found"

**Solution:**
```bash
# Verify Kitty is installed
which kitty

# If not found, install it (see Prerequisites above)
```

### No Tabs Showing

**Problem:** Extension loads but shows "No tabs found"

**Solution:**
1. Make sure Kitty is running
2. Open at least one terminal tab in Kitty
3. Press `⌘+K` to refresh

### "Failed to activate tab" Error

**Problem:** Can't activate a tab

**Solution:**
1. Check that the tab still exists (it may have been closed)
2. Try refreshing with `⌘+K`
3. Restart Kitty

### Permission Issues

**Problem:** Access denied errors

**Solution:**
```bash
# Make sure the socket directory exists
mkdir -p ~/.local/share/kitty

# Check permissions
ls -la ~/.local/share/kitty
```

## Development

### Project Structure

```
raycast-kitty-tabs/
├── src/
│   ├── commands/
│   │   └── listTabs.ts       # Main command logic
│   ├── components/
│   │   ├── TabList.tsx       # Tab list UI
│   │   └── TabItem.tsx       # Individual tab UI
│   ├── utils/
│   │   ├── kittyAPI.ts       # Kitty API calls
│   │   ├── cache.ts          # Caching layer
│   │   └── errorHandler.ts   # Error handling
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── index.ts              # Entry point
├── assets/
│   └── icon.svg              # Extension icon
├── test-kitty.js             # Test script
└── README.md                 # Full documentation
```

### Available Commands

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Test Kitty integration
node test-kitty.js
```

### Debug Mode

To enable debug logging:

1. Open Raycast
2. Go to Extensions
3. Find "Kitty Tabs"
4. Enable debug mode

Logs will be available in the Raycast console.

## Tips & Tricks

### Performance

- The extension caches tab lists for 1 second
- Press `⌘+K` to force refresh if needed
- For large numbers of tabs, use search to filter

### Multiple Instances

- The extension shows tabs from all Kitty instances
- Tabs are grouped by window
- Active tabs are highlighted

### Workflow Integration

- Use with other Raycast extensions
- Set up keyboard shortcuts for quick access
- Combine with Raycast's clipboard history

## Need Help?

- Check the full [README.md](README.md)
- Review the [troubleshooting guide](README.md#troubleshooting)
- Test with `node test-kitty.js`
- Check Raycast console for errors

## Next Steps

Once you have everything working:

1. ✅ Customize keyboard shortcuts in Raycast
2. ✅ Adjust the cache duration if needed
3. ✅ Explore advanced features
4. ⭐ Star the repository if you find it useful!

---

**Happy tab switching!** 🚀
