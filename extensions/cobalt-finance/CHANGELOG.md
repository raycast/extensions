# Cobalt Changelog

## [Merchant Logos] - 2026-07-10

- Merchant, institution, and recurring-stream logos now work out of the box — no manual Brandfetch or logo.dev token required
- Remove `brandfetchClientId` and `logoDevToken` preferences

## [API Sync] - 2026-06-11

- Realign to current `/v1` public API schemas via generated `api-types.ts` (`bun run gen:api`)
- Recurring path moved from `/v1/transactions/recurring` to `/v1/recurring`
- Account / transaction / recurring field shapes updated (`balance`, `institution`, `items`, flat `category`)
- Drop Net Worth and Net Worth menu-bar commands pending a public `/v1/networth` endpoint

## [Initial Version]

- Recent Transactions, Recurring Transactions, Accounts, Net Worth commands
- Net Worth menu-bar command with category breakdown
- AI tool: `Execute Cobalt Code` for free-form questions against the Cobalt sandbox
- OAuth sign-in with refresh-token storage in the macOS Keychain
