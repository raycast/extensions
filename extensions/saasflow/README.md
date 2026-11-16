# SaaSFlow

Track your SaaS business from Raycast. Glance at MRR and cash in the menu bar, switch between companies you have access to, and ask AI questions about your SaaSFlow data without opening the dashboard.

Requires a [SaaSFlow](https://saasflow.com) account.

## Commands

- **MRR & Cash** — menu-bar command. Shows the active company's CMRR (or MRR — switchable in preferences) and current cash balance, refreshed every 15 minutes.
- **Switch Company** — pick which company the menu bar and AI tools act on. The selection is remembered across sessions.
- **Sign Out** — clear the stored OAuth tokens and the active-company selection.

## Ask SaaSFlow (AI)

The extension registers 38 read-only AI tools so Raycast AI can answer natural-language questions about your data. A few examples:

- *"What's my MRR today?"* → `data-mrr-at-date`
- *"Show me last quarter's P&L"* → `data-profit-loss-data`
- *"Which customers churned in March?"* → `data-customer-changes`
- *"Find the transaction from Stripe on Jan 12"* → `search`, then `get-transaction`
- *"Top 10 expense vendors this year"* → `data-top-expense-vendors`

The 30 `data-*` tools mirror the slices that power the SaaSFlow dashboards (MRR, cohorts, cash flow and balance forecasts, P&L, balances, retention, benchmarks, valuation). Eight hand-tuned tools cover company, customer and transaction lookups and free-text search.

## Setup

1. Install the extension from the Raycast Store.
2. Open any SaaSFlow command (or @-mention the extension in Quick AI). Raycast pops a browser to `api.saasflow.com` for sign-in and consent.
3. Pick the company you want active via **Switch Company**.

The menu bar fills in as soon as you pick a company. Until you sign in, it offers a **Sign in to SaaSFlow…** item that opens Switch Company.

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

`yarn dev` runs `ray develop`, which sideloads the extension into Raycast and reloads on save. The 38 AI tool wrappers under `src/tools/` are auto-generated from `@saasflow/slices` + the API's OpenAPI spec — run `yarn workspace saasflow-raycast generate-tools` to refresh them by hand, or let `yarn dev` / `yarn build` do it.

To publish under the SaaSFlow Raycast org: `yarn workspace saasflow-raycast publish`. The wrapper script swaps `package.json#name` to `saasflow` for the duration of the upload (the monorepo workspace stays `saasflow-raycast` to avoid colliding with the published CLI package).

### Publishing an update

The store copy lives in the public [`raycast/extensions`](https://github.com/raycast/extensions/tree/main/extensions/saasflow) monorepo. Every update, like the first release, is a pull request there that Raycast reviews; users get it automatically once it merges. Before running `publish`:

1. `yarn workspace saasflow-raycast build` must end with `built extension successfully` (check-all does not run `ray build`).
2. Add a `## [Title] - {PR_MERGE_DATE}` entry at the top of `CHANGELOG.md`. Raycast fills in the date on merge.
3. Compare `extensions/saasflow` there with this folder. Raycast and reviewers edit it directly (dependency patches, review fixes), and `publish` refuses until those edits are merged back with `npx @raycast/api@latest pull-contributions`. Since `publish` runs from a staged copy outside this repo, port any code change from there into this folder by hand, or the next publish undoes it. The June 2026 review's OAuth fixes were ported back on 2026-11-16.
4. Smoke-test in Raycast: OAuth sign-in and refresh, switching company, one AI tool, the menu-bar item. Run `yarn workspace saasflow-raycast dev` from this branch. It loads the extension as a development copy (`@saasflow-raycast`, its own sign-in) next to the store one; disable the store copy in Raycast Settings → Extensions while testing. If the store copy was enabled when the dev copy loaded, Raycast imports the dev copy's commands disabled (greyed out, empty checkbox): tick them there.

Fixes requested in the Raycast review go into this folder first, then `publish` again; it pushes more commits to the same pull request.
