# Metals Prices Changelog

## [Initial Version] - 2026-08-14

- Live per-gram prices for gold, silver, platinum and palladium, each broken down by the purity grades it's traded in (gold 24K/22K/21K/18K; the white metals by fineness).
- Daily change vs. previous close on the pure-metal row.
- 1-month, 3-month, 6-month, and 1-year averages, with a metal + purity selector that remembers your last choice.
- Selectable display currency (SAR, AED, KWD, QAR, BHD, OMR, USD, EUR, GBP), with precision that adapts to the value so low-priced metals stay readable.
- On-demand history: opening loads only the recent ~30 days (1-month average ready instantly); the 3M / 6M / 1Y averages load only when pressed, each showing how many API requests it will use first.
- Local caching to stay within the metals.dev free tier — one request covers every metal, so switching metals never costs extra.
- metals.dev API key is entered via a required password preference on first run.
