# Hyperliquid for Raycast

A fast, **read-only** companion for [Hyperliquid](https://app.hyperliquid.xyz). Glance at perp prices, your open positions and PnL, and pin live tickers to your menu bar — without opening the browser.

> This extension never asks for private keys or API secrets. It only reads public data from Hyperliquid's Info API by wallet address.

## Commands

- **Markets** — browse every perp market with price, 24h change, funding and volume, plus a header with total volume and open interest. Switch the view between **All**, **Favorites**, **Top Gainers**, **Top Losers** and **Highest Funding**. Open a market for a candlestick chart (1h / 4h / 1d) and stats; if you hold the coin, your **entry and liquidation prices are drawn right on the chart** alongside your position details. Star markets to favorite them.
- **My Positions** — your open perp positions across one or more wallets with **live PnL**: size, leverage, entry, mark, liquidation price, unrealized PnL and ROE. The header shows account value, total uPnL and a **margin-health readout**, and positions near liquidation are flagged. Open **Portfolio Performance** for an equity / PnL chart over 1D / 1W / 1M / All Time. Switch between wallets or see an aggregate.
- **Manage Wallets** — add, label and remove the wallet addresses you track. Stored locally on your machine.
- **Prices** _(menu bar)_ — your favorite tickers and their 24h change, always a glance away. If any tracked position drifts close to its liquidation price, the menu-bar icon turns red and lists the at-risk positions.

## Preferences

- **Default Chart Interval** — candle interval used when opening a market.
- **Liquidation Alert Distance** — how close (in %) the mark price must get to a position's liquidation price before it's flagged in My Positions and the menu bar (default 5%).

## Privacy

All data is fetched from Hyperliquid's public Info API (`https://api.hyperliquid.xyz/info`) and WebSocket. Wallet addresses and favorites are stored locally via Raycast's `LocalStorage`. No private keys, no signing, no trading.

## Disclaimer

Not affiliated with Hyperliquid. For informational purposes only — not financial advice. Account value shown reflects your **perps** account only.
