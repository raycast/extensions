# Stock Tracker

View stock market data in Raycast. Search for individual stocks by name or ticker symbol, and keep track of your portfolio by adding stocks to your list of favorites.

Uses the public Yahoo Finance API, so no authentication or API keys are required.

## Features

- Search for stocks across multiple markets (America, Turkey, Crypto, Forex, etc.)
- Create and manage multiple watchlists
- Pin watchlists for quick access
- View stock prices, changes, and volume
- Customizable column display preferences
- Turkish and English language support
- Add/remove stocks from watchlists
- Copy stock symbols to clipboard

## Usage

### Search Stocks

Search for stocks across all markets. Simply type the stock symbol or company name in Raycast.

![Search Stocks](media/c6e90ad9-46b5-433f-b650-7873c8875ba3.png)

### View Stock Details

View detailed information about stocks including price, percentage change, and volume across different exchanges.

![Stock Details](media/6210fa01-374f-44d6-bf49-b24371ec1735.png)

### Manage Watchlists

Create and manage watchlists. Pin your favorite watchlist for quick access.

![Watchlist](media/b875a9e6-397b-47a7-8404-cee9fb2bc0ad.png)

## Commands

- **Search Stocks**: Search for stocks and add them to your watchlist
- **Watchlist**: View and manage your stock watchlists

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## License

MIT
