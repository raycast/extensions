# Quick Toshl

A Raycast extension for [Toshl Finance](https://toshl.com): add expenses, income, and transfers, browse and search entries, manage categories/tags/accounts/budgets, and use **Raycast AI** tools for natural-language workflows.

![Raycast](https://img.shields.io/badge/Raycast-Extension-FF6154)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Commands

| Command | Description |
| ------- | ----------- |
| **Add Expense** | Form to add an expense (category, tags, account, recurrence). |
| **Add Income** | Form to add income. |
| **View Transactions** | Recent transactions: view, edit, delete, grouped by date. |
| **Add Transfer** | Move money between accounts. |
| **View Budgets** | Budget progress and limits. |
| **Search Entries** | Filter by date, type, category, tags, account, description. |
| **View Planning** | Spending plan and predictions (Pro; may 403 on free accounts). |
| **Manage Categories** | Create, rename, or delete expense/income categories. |
| **Manage Tags** | Create, edit, or delete tags. |
| **Manage Accounts** | Create, edit, or delete accounts. |
| **Manage Budgets** | Create, edit, or delete budgets (respects Toshl plan limits). |
| **My Profile** | Profile from `/me`: currency, locale, timezone, API-related limits. |

### Raycast AI tools

Use **Raycast AI** (extension tools) for prompts like “add 50k lunch” or “search expenses last month”.

| Tool | Purpose |
| ---- | ------- |
| `add-expense` / `add-income` | Add entries; supports Vietnamese amount shortcuts (`50k`, `triệu`, …). |
| `add-transfer` | Record transfers between accounts. |
| `search-entries` | Search and summarize transactions. |
| `get-budgets` | Budget status. |
| `get-planning` | Planning outlook (Pro). |
| `list-categories-tags` | Categories, tags, and accounts (always use IDs from here). |
| `update-entry` / `delete-entry` | Update or delete an entry (not transfers—use `update-transfer`). |
| `update-transfer` | Update a transfer by `entryId`. |
| `create-category` / `update-category` / `delete-category` | Category CRUD. |
| `create-tag` / `update-tag` / `delete-tag` | Tag CRUD. |
| `create-account` / `update-account` / `delete-account` | Account CRUD. |
| `create-budget` / `update-budget` / `delete-budget` | Budget CRUD. |
| `get-me` | User profile from `/me`. |
| `get-tag-sums` | Aggregated sums per tag (`/tags/sums`; currency defaults from `/me`). |
| `list-entry-locations` | Saved entry locations for a range (`/entries/locations`). |

### Highlights

- **Vietnamese-friendly**: Parses amounts like `50k`, `3tr`, `5 triệu`.
- **Default currency**: Taken from Toshl (`/me`), not hard-coded.
- **Caching**: Categories, tags, accounts, and currencies use ETag / `If-Modified-Since` where applicable.
- **Transfers**: Shown distinctly in lists; use `update-transfer` for AI edits to transfers.

## Configuration

### Required

- **Toshl API key** – Create a **Personal token** in [Toshl Developer settings](https://developer.toshl.com/) and paste it into the extension preference **Toshl API Key**.

### Optional

- **Force Refresh Cache** – Each load uses conditional requests; if the API fails, the last successful metadata may be reused for up to **24 hours**. Enable, run any command once, then disable to clear the in-memory cache (e.g. after edits in Toshl elsewhere).
- **Enable Demo Data** – Uses mock data instead of the API (for UI development).

## Development

From the extension directory:

```bash
npm install
npm run build    # production bundle
npm run lint     # ESLint + Prettier
npm run dev      # ray develop (watch mode)
```

Optional **live API smoke test** — **manual only** (not part of `npm test` or CI). Calls the real Toshl API with your token; creates disposable `QTT-TEST-*` data and removes it at the end.

```bash
node scripts/toshl-integration-test.cjs
```

If `TOSHL_API_KEY` is unset, the script tries `op read "op://Code/Toshl API/credential"` when the [1Password CLI](https://developer.1password.com/docs/cli/) is installed and signed in.

## License

MIT – see [LICENSE](LICENSE).
