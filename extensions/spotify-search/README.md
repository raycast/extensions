# Spotify Search - Raycast Extension

A Raycast extension to search for songs, albums, and artists on Spotify.

## Features

- 🔍 Search for artists, songs, and playlists
- 🎵 View track duration, album info, and artist details
- 🔗 Open results directly in Spotify
- 📋 Copy URLs and names to clipboard
- ⚡ Fast and responsive search with debouncing

## Setup

### 1. Create a Spotify App and Get Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (use the same account you use for Spotify)
3. Click the green **"Create an app"** button
4. Fill in the app details:
   - **App name**: `Raycast Spotify Search` (or any name you prefer)
   - **App description**: `Raycast extension for searching Spotify`
   - **Website**: You can leave this blank or add any URL
   - **Redirect URI**: Not needed for this extension (leave blank or add `http://localhost`)
   - Check "I understand and agree to Spotify's Developer Terms of Service"
   - Click **"Save"**
5. After creating the app, you'll be taken to your app's dashboard
6. On the app page, you'll see:
   - **Client ID**: This is visible immediately (a long string of letters and numbers)
   - **Client Secret**: Click the **"View client secret"** button to reveal it (you may need to click "Show client secret" if it's hidden)
7. **Copy both values** - you'll need them in the next step

### 2. Install the Extension

1. Open Raycast
2. Go to Extensions → Import Extension
3. Select this directory
4. The extension will be installed

### 3. Configure Credentials

1. Open Raycast
2. Go to Extensions → Spotify Search → ⚙️ Configure Extension
3. Enter your Spotify **Client ID**
4. Enter your Spotify **Client Secret**
5. The extension is now ready to use!

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Search Spotify" or use the command
3. Start typing to search for artists, songs, or playlists
4. Results are organized by type (Artists, Songs, Playlists) with artists shown first
5. Press Enter to open in Spotify, or use the action panel for more options

## Actions

- **Open in Spotify**: Opens the item in your Spotify app or web player
- **Play Preview** (tracks only): Opens the 30-second preview in your browser
- **Copy URL**: Copies the Spotify URL to clipboard
- **Copy Name**: Copies the formatted name to clipboard

## Development

```bash
# Install dependencies (using npm or bun)
npm install
# or
bun install

# Develop the extension
npm run dev
# or
bun run dev

# Build the extension
npm run build
# or
bun run build

# Lint the code
npm run lint
# or
bun run lint
```

## Requirements

- Raycast app installed
- Spotify Developer account
- Node.js 18+ or Bun (for development)

## Icon

The extension references `spotify-icon.png` in the package.json. You can:
- Add your own Spotify icon (512x512px PNG recommended)
- Or remove the icon property from package.json to use the default Raycast icon

## License

MIT

