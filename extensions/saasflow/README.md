# SaaSFlow

Track your SaaS business from Raycast. Glance at MRR and cash in the menu bar, switch between companies you have access to, and ask AI questions about your SaaSFlow data without opening the dashboard.

Requires a [SaaSFlow](https://saasflow.com) account.

## Commands

- **MRR & Cash** — menu-bar command. Shows the active company's CMRR (or MRR — switchable in preferences) and current cash balance, refreshed every 15 minutes.
- **Switch Company** — pick which company the menu bar and AI tools act on. The selection is remembered across sessions.
- **Sign Out** — clear the stored OAuth tokens and the active-company selection.

## Ask SaaSFlow (AI)

The extension registers 31 read-only AI tools so Raycast AI can answer natural-language questions about your data. A few examples:

- _"What's my MRR today?"_ → `data-mrr-at-date`
- _"Show me last quarter's P&L"_ → `data-profit-loss-data`
- _"Which customers churned in March?"_ → `data-customer-changes`
- _"Find the transaction from Stripe on Jan 12"_ → `search`, then `get-transaction`
- _"Top 10 expense vendors this year"_ → `data-top-expense-vendors`

The 23 `data-*` tools mirror the slices that power the SaaSFlow dashboards (MRR, cohorts, cash flow, P&L, balances, retention). Eight hand-tuned tools cover company / customer / transaction lookups and free-text search.

## Setup

1. Install the extension from the Raycast Store.
2. Open any SaaSFlow command (or @-mention the extension in Quick AI). Raycast pops a browser to `api.saasflow.com` for sign-in and consent.
3. Pick the company you want active via **Switch Company**.

That's it. The menu bar starts populating on the next refresh.

### Using an API key instead of OAuth

Prefer not to OAuth? Mint a personal API key in the SaaSFlow dashboard and paste it into **Raycast Settings → Extensions → SaaSFlow → API key (fallback)**. The extension uses the API key when set, and OAuth only as a fallback.

### Pointing at staging or a self-hosted backend

**Raycast Settings → Extensions → SaaSFlow → API base URL** overrides the default `https://api.saasflow.com`. Useful for SaaSFlow's own staging environment and for testing against a local backend.

## Privacy

The extension talks only to your configured `apiBaseUrl` (default: `https://api.saasflow.com`) and Raycast's OAuth relay (`raycast.com/redirect`). OAuth tokens and the active-company id are stored in Raycast's local secure store and never sent elsewhere.

## Local development

```bash
yarn install
yarn workspace saasflow-raycast dev
```

`yarn dev` runs `ray develop`, which sideloads the extension into Raycast and reloads on save. The 31 AI tool wrappers under `src/tools/` are auto-generated from `@saasflow/slices` + the API's OpenAPI spec — run `yarn workspace saasflow-raycast generate-tools` to refresh them by hand, or let `yarn dev` / `yarn build` do it.

To publish under the SaaSFlow Raycast org: `yarn workspace saasflow-raycast publish`. The wrapper script swaps `package.json#name` to `saasflow` for the duration of the upload (the monorepo workspace stays `saasflow-raycast` to avoid colliding with the published CLI package).
