# Figa Raycast Extension

Raycast extension foundation for Figa external API integrations.

## Decisions

- Package location: `apps/raycast`.
- MVP auth: manual Figa `x-api-key` stored in a required Raycast `password` preference.
- Production API endpoint: `https://api.figa.cc`.
- OAuth/pairing and Raycast AI tools are intentionally out of scope for this package skeleton.
- The package is standalone for Raycast Store publishing and does not import private monorepo workspace packages at runtime.

See `../../docs/raycast-extension-decision.md` for the architecture note.
See `../../docs/raycast-ai-tools-spike.md` for the decision to defer Raycast AI tools from the first public release.
See `../../apps/help/src/pages/developers/integrations/raycast.astro` for customer setup docs, QA matrix, and release checklist.

## Local Development

Prerequisites:

- Raycast installed and signed in.
- Node.js 22.14 or newer.
- npm 7 or newer.

From this directory:

```sh
npm install
npm run dev
```

From the monorepo root:

```sh
pnpm -F figa dev
pnpm -F figa build
pnpm -F figa lint
```

Raycast preferences:

- `API Key`: a dedicated Figa workspace API key. Use read preset for read commands and write preset for mutation commands.

## Current Commands

- `Show Workspace Context`: calls `GET /api/v1/context`, validates the configured key, and shows workspace context, plan tier, critical limits, context defaults, discovered capabilities, safe error states, and shortcuts to API key settings and developer docs.
- `Search Expenses`: calls `GET /api/v1/context` and `GET /api/v1/expenses?year=YYYY&month=MM`, gates on `expenses.read` when context v2 capabilities are present, and lists current-month expenses with all/unpaid/paid quick views, copy/paste actions, Figa deep links, and a selected-expense mark-paid action for keys with `expenses.payments` capability.
- `Show Monthly Summary`: calls `GET /api/v1/context` and `GET /api/v1/expenses/monthly-totals`, gates on `expenses.read` when available, and shows the same seven-month overview range used by the web app.
- `Create Expense`: calls `GET /api/v1/context`, `GET /api/v1/categories`, `GET /api/v1/recipients`, and `POST /api/v1/expenses`, gates on `expenses.write` when available, defaults currency from workspace context, uses live reference choices, and sends a UUID `Idempotency-Key`.
- `Search Categories`: calls `GET /api/v1/context` and `GET /api/v1/categories`, gates on `categories.read` when available, and lists global/workspace categories with copy/paste actions and Figa deep links.
- `Search Recipients`: calls `GET /api/v1/context` and `GET /api/v1/recipients`, gates on `recipients.read` when available, and lists global/workspace recipients with copy/paste actions and Figa deep links.

Broader update/delete workflows are deferred until a dedicated low-risk Raycast UX is specified.

## API Client Contract

The client in `src/api/client.ts`:

- uses the production Figa API endpoint,
- sends `x-api-key`,
- sends `User-Agent: FigaRaycast/0.1.0 (Raycast)`,
- expects Figa response envelopes,
- supports context `schemaVersion: 2` capabilities/defaults while keeping the workspace context command compatible with `schemaVersion: 1` responses,
- supports expense list, expense create, expense payment, and monthly-total contracts from the external API,
- supports category and recipient list contracts used by later expense forms,
- normalizes common errors for Raycast commands: invalid key, paid-plan gate, insufficient permissions, route forbidden, validation errors, rate limits, network failures, and non-JSON responses.

Do not log or render the raw API key. Do not include real workspace data or API keys in Store screenshots.

## Release Notes

Raycast Store review uses npm, so keep `package-lock.json` committed for this package. Run `npm run build` before publishing.

`npm run lint` runs local ESLint and Prettier checks. Run `npm run lint:store` before publishing; it performs full Raycast metadata validation and currently requires the `author` value to match the real Raycast Store handle.

Use the help-page release checklist before Store submission. It covers versioning, command review, redacted screenshots, Store metadata, and supported paid-plan/API-key notes.

## Manual QA Notes

Use a non-production workspace or redact workspace data before creating screenshots. Never capture the raw API key.

Scenarios for #529/#540:

- Valid Pro or Enterprise read key: command shows workspace name, workspace ID, base currency, default base currency, plan tier, all critical limits, read capabilities, disabled write/payment capabilities, and links to workspace API key settings and Developer API docs.
- Valid Pro or Enterprise write key: command shows read/write/delete capabilities and payment capability as available.
- Legacy context v1 response: command still renders workspace, plan, limits, and base currency without requiring capability/default fields.
- Blank key: Raycast required preferences should prompt first; if a blank value reaches the command, it shows an API-key-required state with an action to open extension preferences.
- Invalid or expired key: command shows an invalid-key state with actions to update extension preferences, open API key settings, and open Developer API docs.
- Free-plan blocked key: command shows a paid-plan-required state without raw key data and offers Billing, API key settings, and docs actions.
- Insufficient permissions: command explains that `workspaces.read` is required and links to API key settings/docs.
- Rate limiting: command asks the user to retry later and keeps the retry action available.
- Network failure: command asks the user to retry without exposing internal API configuration.

Scenarios for #530:

- Valid Pro or Enterprise read key with expenses: `Search Expenses` shows current-month expenses, all/unpaid/paid quick views, formatted amounts, dates, copy/paste actions, and Figa expense links.
- Valid Pro or Enterprise read key with no expenses: `Search Expenses` shows an empty state with refresh, Figa expenses, preferences, and docs actions.
- Valid Pro or Enterprise read key: `Show Monthly Summary` shows recent monthly total/paid/unpaid values using the workspace base currency.
- Context v2 response without `expenses.read`: both read commands stop before calling expense endpoints and show an API-key permission state.
- Invalid or expired key, free-plan blocked key, insufficient permissions, rate limiting, and network failure use the shared Raycast error detail state without rendering raw key data.

Scenarios for #542:

- Valid Pro or Enterprise read key with categories/recipients: reference commands show global vs workspace scope, expense counts, copy/paste actions, and Figa detail/list links.
- Valid Pro or Enterprise read key with no categories or recipients: commands show empty states with refresh, Figa list, preferences, and docs actions.
- Context v2 response without `categories.read` or `recipients.read`: the relevant command stops before calling the reference endpoint and shows a permission state.
- Invalid or expired key, free-plan blocked key, insufficient permissions, rate limiting, and network failure use the shared Raycast error detail state without rendering raw key data.

Scenarios for #543:

- Valid Pro or Enterprise write key: `Create Expense` pre-fills workspace base currency, loads live categories and recipients, submits `POST /api/v1/expenses` with a UUID `Idempotency-Key`, shows a success toast, and exposes actions to open the expense/workspace in Figa or create another expense.
- Valid Pro or Enterprise read key without `expenses.write`: the command stops before calling reference or create endpoints and shows a write-permission state.
- Invalid form input: the command highlights fixable fields before sending a request.
- Retry after a submit failure reuses the same idempotency key until the form changes; duplicate in-flight submits are ignored.
- Invalid or expired key, free-plan blocked key, insufficient permissions, rate limiting, and network failure use the shared Raycast error detail state without rendering raw key data.

Scenarios for #531:

- Valid Pro or Enterprise write key with `expenses.payments`: an unpaid selected expense exposes `Mark Expense Paid`, confirms the action, reads current payment metadata, records a remaining-amount payment with a UUID `Idempotency-Key`, shows a success toast, and refreshes the expense list.
- Valid Pro or Enterprise read key without payment capability: unpaid selected expenses expose a payment-permission detail instead of sending a mutation request.
- Already paid, skipped, and template-only expenses do not expose the payment action.
- Duplicate in-flight submits are ignored; retry starts by re-reading payment metadata so an already-recorded payment is not repeated.
- API validation errors, including already-paid or payment-exceeds-amount cases, use the shared friendly error handling.
