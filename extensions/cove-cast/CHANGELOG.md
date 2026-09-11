# CoveCast Changelog

## [Initial Version] - 2026-07-24

- **Buy** command: read a token contract address from the clipboard, auto-detect the chain via
  Dexscreener, pick a USD amount, and open the matching Cove deeplink.
- **Quick Buy** command: one-keystroke buy of a configured USD amount (no UI).
- Native Cove base62 deep-link protocol (`g_`/`b_`), all 11 Cove networks supported (ethereum,
  base, bnb/bsc, megaeth, solana, tempo, monad, story, hyperevm, plasma, robinhood).
- Opens the Telegram app directly via `tg://`.
