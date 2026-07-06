# Cobalt Changelog

## [Review Fixes] - 2026-06-11

- Force re-auth when the access token is expired and no refresh token is available (or refresh fails)
- Drop the shared Brandfetch client ID default; the field is now opt-in so users don't share the author's quota

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
