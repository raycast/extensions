# Schwab Portfolio (Raycast Extension)

View your Charles Schwab brokerage accounts, positions, and charts directly in Raycast.

Charts are rendered locally; no account data ever leaves your machine except to Schwab's API.

## Commands

- **View Portfolio**: Accounts, balances, positions, and charts
- **Ticker Lookup**: Search by stock/ETF symbol or company name
- **Market Overview**: Major indexes and top S&P 500 gainers and losers
- **Watchlist**: Track a local list of symbols without holding them
- **Recent Orders**: Orders placed across your accounts in the last 30 days (read-only)
- **Portfolio Menu Bar**: Quick summary in the menu bar (refreshes every 5 minutes)

## Ask AI

The extension ships AI tools, so in Raycast AI chat you can `@schwab-portfolio` and ask things like
"how is my portfolio doing today?", "what's AAPL trading at?", or "what are the biggest movers?".
All tools are read-only — the AI can never place trades or move money.

## Setup

### 1. Create a Schwab developer app (one-time, free)

The extension talks directly to Schwab's official API, so you need your own API credentials:

1. Go to [developer.schwab.com](https://developer.schwab.com) and sign up for a developer
   account (this is separate from your brokerage login).
2. Create an app using the **Trader API — Individual** product (includes both Accounts &
   Trading and Market Data).
3. Set the app's **Callback URL** to exactly:
   `https://raycast.com/redirect?packageName=Extension`
4. Wait for the app status to become **Ready For Use** — Schwab approval can take a few days.
5. Open your app's page: the **App Key** (Client ID) and **Secret** are shown there.

### 2. Configure the extension

1. Install dependencies: `npm install`
2. Start the extension in Raycast: `npm run dev`
3. Open the extension preferences in Raycast:
   - **Schwab App Key / Secret**: Paste the values from your app's page on developer.schwab.com
   - **Account Aliases (JSON)** (optional): Override account labels shown in Raycast, e.g.:
     - `{"12345678":"Roth","23456789":"Taxable"}`
4. Run any command — the first one opens Schwab's login page in your browser to authorize
   read-only access. You'll be asked to re-authenticate about every 7 days (Schwab's refresh
   tokens expire; that's a Schwab limit, not an extension bug).

## Development

- Run in dev mode: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Disclaimer

This project is not affiliated with or endorsed by Charles Schwab. Use at your own risk.

## License

MIT — see `LICENSE`.
