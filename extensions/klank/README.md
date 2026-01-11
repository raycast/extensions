# Klank Raycast Extension

Search and navigate your Klank workspace directly from Raycast.

## Features

- **Search**: Find tracks, albums, playlists, teams, tours, events, and demos
- **Quick Actions**: Jump directly to upload, tracks, or albums pages
- **Keyboard Shortcuts**: Fast navigation with Raycast's keyboard-first interface

## Setup

1. Install the extension from the Raycast Store (or build locally)
2. Get your API access token from Klank Settings > Integrations
3. Add your access token in the extension preferences

## Commands

| Command      | Description                 |
| ------------ | --------------------------- |
| Search Klank | Search all your Klank items |
| Quick Upload | Open the track upload page  |
| View Tracks  | Open your tracks list       |
| View Albums  | Open your albums list       |

## Development

### Prerequisites

- [Raycast](https://raycast.com/) installed
- Node.js 18+
- bun

### Local Development

```bash
# Install dependencies
bun install

# Start development mode
bun run dev

# The extension will automatically appear in Raycast
# Configure your API token in Raycast: Preferences → Extensions → Klank

# Build for production
bun run build

# Lint code
bun run lint
```

### Publishing

```bash
bun run publish
```

## Extension Icon

The extension requires an icon at `extension-icon.png` (512x512px recommended).

## API Endpoint

The extension communicates with your Klank instance via the `/api/raycast/search` endpoint. This endpoint:

- Requires authentication via access token
- Returns all searchable items (tracks, albums, playlists, teams, tours, events, demos)
- Supports CORS for cross-origin requests

## Shared Code

This extension shares types and route definitions with the main Klank web app via the `@klank/command` package. This ensures consistency between the command search in the web app and this Raycast extension.
