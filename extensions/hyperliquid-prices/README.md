# Hyperliquid Prices

A Raycast extension to check HYPE and BTC prices from the Hyperliquid API directly from your search bar.

## Features

- 🚀 **Quick Access**: Check HYPE and BTC prices instantly from Raycast search bar
- 💰 **Real-time Prices**: Fetches live mid prices from Hyperliquid API
- 🔍 **Search All Assets**: Search through all available cryptocurrencies on Hyperliquid
- 📋 **Copy Prices**: Easily copy raw or formatted prices to clipboard
- 🌐 **Open in Browser**: Quick access to view assets on Hyperliquid's trading interface
- 🏷️ **Smart Labeling**: Shows HYPE-PERP for Hyperliquid perpetuals and PERP for Bitcoin perpetuals

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Check Prices" or "Hyperliquid"
3. View HYPE and BTC prices by default, or search for other cryptocurrencies
4. Use keyboard shortcuts:
   - **⌘ + C**: Copy raw price
   - **⌘ + Shift + C**: Copy formatted price with $ symbol
   - **⌘ + O**: Open asset on Hyperliquid trading platform

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. Open Raycast and find your extension

## Development

```bash
# Install dependencies
npm install

# Start development with hot reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## API Information

This extension uses the Hyperliquid public API:
- **Endpoint**: `https://api.hyperliquid.xyz/info`
- **Method**: POST with `{"type": "allMids"}`
- **Documentation**: [Hyperliquid API Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)

## License

MIT License 