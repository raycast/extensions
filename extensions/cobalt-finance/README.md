# Cobalt for Raycast

Access your [Cobalt](https://cobaltpf.com) finances from Raycast — recent transactions, recurring streams, and account balances, plus an AI command that runs JavaScript against your data inside the Cobalt sandbox.

## Commands

- **Recent Transactions** — browse and search recent transactions across all connected accounts.
- **Recurring Transactions** — active subscriptions, bills, and recurring income.
- **Accounts** — connected bank, credit, and brokerage accounts with current balances.

## AI

The `Execute Cobalt Code` tool lets `@cobalt` answer free-form questions about your finances by running JavaScript inside a V8 sandbox with a typed `cobalt.*` SDK scoped to your account. Ask things like:

- `@cobalt how much did I spend on coffee in the last 90 days`
- `@cobalt top 5 merchants this month by spend`
- `@cobalt what's my net worth`

## Setup

1. Sign in with your Cobalt account on first launch — Raycast opens a browser window for OAuth.
2. (Optional) Override the API base URL under Extension preferences if you self-host.
3. (Optional) Add a [logo.dev](https://logo.dev) token if you want subscription brand logos.

## Privacy

All data is fetched live from the Cobalt API over HTTPS. The OAuth refresh token is stored in the macOS Keychain. No analytics. No third-party tracking.

## License

MIT (see `package.json`). This is a standalone Raycast extension that talks to the Cobalt API over HTTPS — no shared server code, no derivative work from the AGPL parts of the repo.
