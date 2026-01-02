# Kalshi

A Raycast extension for searching, browsing, and managing prediction markets on [Kalshi](https://kalshi.com). Quickly access trending markets, search for specific events, and keep track of your favorite markets without leaving Raycast.

## Features

### 🔍 Search & Browse Markets
- **Default View**: Browse top markets sorted by 24-hour trading volume
- **Search**: Real-time search across all available Kalshi markets with fuzzy matching
- **Market Details**: View individual markets within each series, sorted by price percentage

### ⭐ Favorites System
- **Favorite Series**: Save entire market series to quickly access later
- **Favorite Markets**: Pin specific markets within a series
- **Persistent Storage**: Favorites are saved locally and persist across sessions
- **Smart Display**: Favorited items appear at the top of their respective lists

### 📊 Market Information
- **Volume Display**: See 24-hour trading volume formatted as `$X.XM` or `$X.XK`
- **Price Percentages**: View "yes" price as a percentage for each market
- **Market Counts**: See how many markets are available in each series
- **Full Titles**: Long titles are displayed with tooltips—no truncation

### 🎯 Quick Actions
- **View Markets**: Navigate into a series to see all individual markets
- **Open in Browser**: Jump directly to the market page on Kalshi
- **Copy to Clipboard**: Copy market tickers or URLs with keyboard shortcuts
- **Toggle Favorites**: Add or remove favorites with `Cmd+F`

## Usage

### Browsing Markets

1. Open Raycast and type "Search Markets" (or set a custom alias)
2. The default view shows **Top Markets by 24h Volume**
3. Use the search bar to find specific markets or events
4. Press `Enter` on any series to view individual markets within it

### Managing Favorites

- **Add to Favorites**: Select a series or market, then press `Cmd+F` or use the action panel
- **Remove from Favorites**: Press `Cmd+F` again or use the "Remove/Unfavorite" action
- **View Favorites**: Favorited items appear in a dedicated "Favorites" section at the top

### Keyboard Shortcuts

- `Cmd+F`: Toggle favorite status
- `Cmd+.`: Copy market ticker (when viewing a series)
- `Enter`: View markets within a series (when on a series item)