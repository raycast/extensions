# FaviconSync for Raycast

Refresh Safari favicons with one command. Fix stale or broken favicon images.

## Features

- **Refresh Favicon**: Clears the cached favicon for the current Safari tab and restarts Safari to fetch a fresh icon

## How It Works

1. Open Raycast and search for "Refresh Favicon"
2. Run the command while Safari is open
3. Safari will quit, clear the favicon cache for the current site, and reopen

Your tabs will restore automatically.

## Requirements

- macOS 13.0 (Ventura) or later
- Raycast
- **Full Disk Access** permission for Raycast (to modify Safari's favicon cache)

## Setup

### Grant Full Disk Access to Raycast

1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click **+** and add **Raycast** from Applications
3. Ensure the toggle is ON

Without this permission, the extension cannot clear Safari's favicon cache.

## Development

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm run dev
```

## License

MIT
