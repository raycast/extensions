# Schwab Portfolio (Raycast Extension)

View your Charles Schwab brokerage accounts, positions, and charts directly in Raycast.

Available on the [Raycast store](https://www.raycast.com/drew_levinson/schwab-portfolio).

Charts are rendered locally; no account data ever leaves your machine except to Schwab's API.

## Commands

- **View Portfolio**: Accounts, balances, positions with unrealized return, and estimated holdings history
- **Schwab Connection Status**: Check whether your app credentials are saved and sign in again
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

1. Install [Schwab Portfolio from the Raycast store](https://www.raycast.com/drew_levinson/schwab-portfolio).
2. Open that extension's preferences in Raycast:
   - **Schwab App Key / Secret**: Paste the values from your app's page on developer.schwab.com
   - **Default Chart Timeframe** (optional): The period price charts open to (1 Day through
     5 Years). Defaults to 1 Month.
   - **Account Aliases (JSON)** (optional): Account names come from your schwab.com
     nicknames automatically — use this only to override them, e.g.:
     - `{"12345678":"Roth","23456789":"Taxable"}`
3. Run any command — the first one opens Schwab's login page in your browser to authorize
   read-only access. You'll be asked to re-authenticate about every 7 days (Schwab's refresh
   tokens expire; that's a Schwab limit, not an extension bug).

## Sign-in and saved credentials

Your App Key and Secret are one-time extension preferences. Schwab's weekly sign-in
reuses them; it does not require a new developer app or new keys. Use **Schwab Connection
Status** to check whether each credential is saved (values are never displayed) and sign
in again. Temporary refresh failures keep your existing session so you can retry.

Store and development installations can have separate Raycast preferences. If you see
setup again, check which copy you opened. An expired sign-in and a missing app credential
are different states.

## Understanding the numbers

- **Current Holdings History** is a hypothetical price estimate using today's stock/ETF
  quantities and cash. It is not Schwab account performance: trades, sold positions,
  deposits, withdrawals, dividends, and other asset classes are not reconstructed.
  It follows the selected account filter and displays the actual price dates. Use
  Schwab for actual period returns; this extension does not fetch that report.
- **P/L in position rows** is unrealized return on open holdings, not total return
  including dividends and realized gains. Hover for the dollar amount. Unsupported
  cost-basis calculations are left unavailable instead of guessed.
- **Market Overview movers** are S&P 500 securities returned by Schwab's movers endpoint,
  not the entire market or your holdings. Percentages are calculated from the screener's
  price and dollar change, then grouped and sorted by sign. Snapshot times can differ
  from an individual quote. Menu-bar movers are your own holdings.
- **Company names** omit common company/share-class suffixes for ordinary equities.
  Tickers remain visible and full security descriptions stay in the detail view.
- **Checking accounts** are not supported by this extension's brokerage-account integration.

## Development

- Install dependencies: `npm install`
- Run a separate development copy: `npm run dev` (its preferences may differ from the store copy)
- Build: `npm run build`
- Lint: `npm run lint`
- Auth regression check (synthetic data, no network): `node --test scripts/verify-oauth.cjs`
- Publish to the Raycast store: `npm run publish` (maintainer only)

## Disclaimer

This project is not affiliated with or endorsed by Charles Schwab. Use at your own risk.

## License

MIT — see `LICENSE`.
