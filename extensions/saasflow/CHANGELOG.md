# SaaSFlow Changelog

## [Initial Version] - 2026-06-19

- **MRR & Cash** menu-bar command — current CMRR (or MRR — switchable in preferences) and cash balance, refreshed every 15 minutes.
- **Switch Company** command — pick which company the menu bar and AI tools act on.
- **Sign out** command — clear stored OAuth tokens and the active-company selection.
- **31 AI tools** for the Ask SaaSFlow chat: company / customer / transaction lookups, free-text search, and 23 auto-generated `data-*` tools mirroring the SaaSFlow data slices (MRR, cohorts, cash flow, P&L, balances, retention).
- Authentication via OAuth 2.1 + PKCE against `api.saasflow.com`, with an API-key fallback in Extension Preferences.
