# Ticker Bar Changelog

## [0.1.1] - 2026-07-31

- Add market artwork across Browse Markets, Manage Watchlist, market details, and the optional menu-bar logo.
- Classify Binance perpetuals before choosing equity or crypto artwork, avoiding ticker-symbol collisions such as MSTR and RIVN.
- Preserve colored direction indicators in the menu dropdown and simplify menu-bar styles to primary price or primary price with daily change.
- Cache CoinGecko logo lookups across Raycast workers and pause optional artwork requests after throttling.
- Recover DexScreener artwork from alternate pools and use the DexScreener provider mark when token artwork is unavailable.
- Standardize perpetual-market naming and rename the standalone refresh command to Update Market Data.
- Refresh and sanitize public screenshots, separate README media from Store metadata, and update to Raycast API 1.104.24.

## [0.1.0] - 2026-07-31

- Track stocks, crypto, Binance Spot pairs, Binance perpetual futures, on-chain tokens, and Polymarket outcomes.
- Choose a primary ticker, primary ticker with daily change, fresh-watchlist average, or icon-only menu bar style.
- Browse across providers and manage, reorder, inspect, refresh, or bulk edit a watchlist of up to 50 assets.
- Open a quote detail view with daily statistics, volume, market cap, funding, market state, provider, and freshness metadata where available.
- Render cached quotes immediately and refresh them with provider-specific TTLs, request timeouts, batching, retry cooldowns, and a cross-command refresh lock.
- Preserve the last valid value when a provider fails, while clearly labeling stale and unavailable quotes.
- Validate and normalize all advanced asset IDs instead of silently accepting malformed entries.
- Support USD, CAD, EUR, and GBP display for CoinGecko crypto quotes.
