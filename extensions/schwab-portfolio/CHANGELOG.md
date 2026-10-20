# Schwab Portfolio Changelog

## [Consistent Position Returns] - 2026-10-04

- Use the same unrealized return calculation in portfolio views and AI answers, including short positions and option multipliers

## [Connection and Portfolio Clarity] - 2026-10-03

- Check saved app credentials and sign in again with Schwab Connection Status
- Preserve sessions after temporary refresh failures and refresh rejected access tokens
- Fix market-mover percentages and label the S&P 500 scope explicitly
- Clarify that holdings history is an estimate, show its price dates, and follow the selected account
- Show unrealized return in position rows and simplify company names while retaining full security descriptions

## [Initial Version] - 2026-08-04

- View all your Schwab brokerage accounts with balances, positions, day P/L, and unrealized P/L
- Account names come from your schwab.com nicknames automatically (override with the
  Account Aliases preference)
- Aggregate portfolio performance chart with selectable timeframes, and high/low labels
  called out directly on every chart
- Browse a symbol's price history as a searchable list of candles, not just the chart
- Ticker lookup by symbol or company name with full quote details and price charts
- Market Overview: major indexes plus the day's top S&P 500 gainers and losers
- Local watchlist with live quotes
- Recent Orders: the last 30 days of orders across accounts, grouped by status
- Menu bar command with portfolio value, day change, and top movers
- Ask Raycast AI about your portfolio, quotes, movers, and watchlist (read-only AI tools)
- Charts are rendered locally and adapt to light/dark theme; no data leaves your machine except to Schwab's API
