# Crypto Price

## [Add source failover] - 2026-06-16

- Default source is now Binance — CryptoCompare's free API now requires an API key
- Automatically fall back across sources (Binance → CoinGecko → OKX → Coinbase → Kraken) so one unavailable or region-blocked source no longer breaks the menu bar
- Add an optional CryptoCompare API key preference
- Show which source provided the price in the dropdown
- Fix a crash when opening the menu bar while a price fetch is failing

## [Support any coin] - 2026-06-15

- Remove the built-in allowlist so any coin symbol supported by the data source can be added (e.g. TRX, DOGE, ADA)
- Fall back to the symbol itself as the display name for coins without a preset name

## [Configure coins with text] - 2024-03-25

- Configure coins with text: default coins value is 'BTC | ETH BNB SOL XRP'
- Display multiple coins on the system menu bar: e.g. set coins to 'BTC ETH | BNB SOL XRP'
- Display one specific coin on the system menu bar: e.g. set value to 'ETH'

## [Initial Version] - 2024-02-18

- Add perference to select source: CryptoCompare, Binance Spot, Binance Futures
- Add perference to select currency
- Add perference to select display style: price, price with 24hr low and heigh, price with 24hr low and heigh in percentage
- Add perfference to select other coins
- Add more information: 24hr volume, supply, market cap
- Display price in compact style
