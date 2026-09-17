# Folio Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Sign In with SnapTrade (OAuth, PKCE, read-only) with token refresh and revoke through the Folio auth worker
- Show Portfolio: net worth per currency, accounts grouped by institution, holdings per account
- Show Positions: every position across accounts in one searchable list with weights and open P&L; optional ticker argument jumps straight to a holding
- Show Activities: All / Trades / Dividends / Deposits across accounts
- Show Fog: idle cash and how long it has been sitting, computed from activities
- Connect Brokerage: read-only SnapTrade Connection Portal and connection status
- Menu Bar Portfolio: net worth (and day change when SnapTrade reports balance history) with masked privacy mode
- Privacy mode (⌘⇧P) that hides every balance
- Bundled Wealthsimple / Questrade / IBKR fixtures for demos and screenshots
