# SaaSFlow Changelog

## [Raycast 2 and Seven New AI Tools] - {PR_MERGE_DATE}

- Runs on Raycast 2 (`@raycast/api` 2.12).
- Seven more AI tools for Ask SaaSFlow: metric definitions, metric explanations, cash flow and balance forecasts, the customers behind a cohort, SaaS benchmarks, and a valuation estimate.
- The menu bar updates as soon as you switch company, sign in or sign out, and loads faster.
- Before you sign in, the menu bar shows a Sign in item instead of an empty menu.
- The List Transactions tool now tells the AI the one value its `status` filter accepts (`uncategorized`).

## [Initial Version] - 2026-06-19

- **MRR & Cash** menu-bar command — current CMRR (or MRR — switchable in preferences) and cash balance, refreshed every 15 minutes.
- **Switch Company** command — pick which company the menu bar and AI tools act on.
- **Sign out** command — clear stored OAuth tokens and the active-company selection.
- **31 AI tools** for the Ask SaaSFlow chat: company / customer / transaction lookups, free-text search, and 23 auto-generated `data-*` tools mirroring the SaaSFlow data slices (MRR, cohorts, cash flow, P&L, balances, retention).
- Authentication via OAuth 2.1 + PKCE against `api.saasflow.com`, with an API-key fallback in Extension Preferences.
