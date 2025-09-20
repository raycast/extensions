# SomaFM for Raycast

Browse and play [SomaFM](https://somafm.com) internet radio stations directly from Raycast.

> Note: "SomaFM" is the correct branding for this service. The Raycast linter may suggest "Somafm" but we're keeping the official branding.

## Features

### 🎯 Current Features (v1.0)

### 🚀 Quick Access
- **Menu Bar Access**: Always-visible menu bar icon shows your favorite stations
  - Click the 🎵 icon in your menu bar
  - Play any favorite station with one click
  - Updates automatically when you add/remove favorites

### 🎵 Stream Playback
- **Smart Player Detection**: Automatically plays streams in your preferred media player
  - Supports IINA, VLC, and Music.app
  - Falls back to system default if no supported player is found
- **High-Quality Streams**: Uses MP3 format for best compatibility
- **Quick Feedback**: Shows loading status and confirms which player opened
- **Now Playing**: See what's currently playing on each station
  - Grid view shows current track in subtitle
  - List view shows with 🎵 icon
  - Auto-refreshes every 30 seconds

### 🎨 Beautiful Interface
- **Grid View**: Visual 3-column layout with station artwork
- **List View**: Compact view with listener counts
- **Toggle Views**: Switch between grid and list with `⌘+Shift+V`
- **Station Details**: See genre, current listeners, and descriptions

### ⭐ Favorites & History
- **Favorites**: Star your favorite stations for quick access
  - Favorites appear at the top of the list
  - Toggle with `⌘+D` or the star action
  - Persists between sessions
- **Recently Played**: Automatically tracks your last 5 played stations
  - Shows ALL recently played stations (including favorites)
  - Stations appear in both Recently Played AND their regular section
  - Clear history with the menu action when needed
  - Helps you quickly return to stations you just discovered

### 🔍 Smart Search
- Search by station name, genre, or description
- Prioritizes name matches for better results
- Real-time filtering as you type

### 📊 Organization & Sorting
- **Sort Options**: 
  - Sort by Name (`⌘+1`) - A-Z or Z-A
  - Sort by Listeners (`⌘+2`) - Least to most or most to least
- **Genre Grouping**: Toggle genre groups with `⌘+G`
- **Station Sections**: Favorites → Recently Played → All Stations

### ⌨️ Keyboard Shortcuts
- `Enter` - Play selected station
- `1-9` - Quick play stations 1-9
- `⌘+D` - Toggle favorite
- `⌘+Shift+V` - Switch between grid/list view
- `⌘+1` - Sort by name
- `⌘+2` - Sort by listeners
- `⌘+G` - Group by genre
- `⌘+⌥+C` - Copy stream URL
- `⌘+R` - Refresh station list

## Installation

1. Install [Raycast](https://www.raycast.com/) (macOS only)
2. Clone this repository
3. Run `npm install && npm run build`
4. Import the extension into Raycast

## Recommended Media Players

For the best experience, install one of these media players:
- [IINA](https://iina.io/) - Modern media player for macOS (recommended)
- [VLC](https://www.videolan.org/vlc/) - Cross-platform media player

Without these, streams will open in Music.app or your default browser.

## Usage

### Browse & Play
1. Open Raycast (`⌘+Space` by default)
2. Type "soma" or "Browse SomaFM Stations"
3. Browse stations in the grid or search for specific genres/stations
4. Press `Enter` or use number keys `1-9` to play
5. Use `⌘+D` to favorite stations you love

### Menu Bar
1. Look for the 🎵 icon in your menu bar
2. Click to see all your favorite stations
3. Click any station to play immediately
4. The menu updates automatically when you add/remove favorites

## About SomaFM

SomaFM is a listener-supported, commercial-free internet radio station broadcasting from San Francisco. With over 30 unique channels of underground/alternative radio, SomaFM has been serving up electronic music, indie rock, and more since 2000.

Consider [supporting SomaFM](https://somafm.com/support/) if you enjoy their stations!

## Development

This extension is built with:
- [Raycast API](https://developers.raycast.com/)
- TypeScript
- React

### Project Structure
```
src/
├── browse-stations.tsx # Main browse command
├── menu-bar-player.tsx # Menu bar extension
├── types/              # TypeScript interfaces
├── utils/              # API, player, and storage utilities
└── hooks/              # React hooks for state management
```

### To Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to ensure code quality
5. Run `npm test` to ensure tests pass
6. Submit a pull request


## License

MIT - See LICENSE file for details

## Credits

- Station data and streams provided by [SomaFM](https://somafm.com)
- Extension icon and station artwork © SomaFM
- Built with ❤️ using [Raycast](https://www.raycast.com/) 