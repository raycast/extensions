# Ticker Bar Changelog

## [Initial Version] - 2026-08-18

- Track stocks, crypto, Binance Spot pairs, Binance perpetual futures, on-chain tokens, and Polymarket outcomes from the macOS menu bar.
- Show the primary ticker, optional daily change, and optional provider artwork in the menu bar.
- Browse across providers and manage, reorder, inspect, refresh, or bulk edit a watchlist of up to 50 assets.
- Open a quote detail view with daily statistics, volume, market cap, funding, market state, provider, and freshness metadata where available.
- Render cached quotes immediately and refresh them with provider-specific TTLs, request timeouts, batching, retry cooldowns, and a cross-command refresh lock.
- Preserve the last valid value when a provider fails, while clearly labeling stale and unavailable quotes.
- Validate and normalize advanced asset IDs instead of silently accepting malformed entries.
- Support USD, CAD, EUR, and GBP display for CoinGecko crypto quotes.
