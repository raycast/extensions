# Hyperliquid Markets

Search and monitor [Hyperliquid](https://hyperliquid.xyz) perpetual markets directly from Raycast.

## Features

- **Search every market** — all Hyperliquid perpetuals, including builder-deployed DEXs. Sorted by 24h volume; search results re-rank by open interest so the deepest markets come first
- **Master–detail layout** — a slim list of tickers and prices on the left with full details on the right, updating as you scroll. Press ⌘D to flip to a dense multi-column table (price, 24h change, volume, open interest)
- **Detail metadata** — 24h change, 24h volume, open interest, hourly funding and funding APR, mark and oracle price, max leverage, and margin mode
- **Filter the noise** — "Top Markets" (default) shows the most-liquid market per symbol, hiding dead builder-DEX duplicates; switch to "All Markets" to see everything
- **Favorites** — press ⌘⇧F to pin a market to the top; favorites always show, even under the Top Markets filter
- **Quick actions** — open a market on app.hyperliquid.xyz, copy its symbol or price, or refresh with ⌘R

## Preferences

- **Network** — switch between Hyperliquid mainnet and testnet

## Notes

This extension is read-only: it uses Hyperliquid's public info API and never asks for keys or signs transactions.
