# Wise Lens Changelog

## [Initial Version] - 2026-06-24

- Dashboard command with a split detail view: prominent total balance, monthly and 30‑day spending tags, balances per currency, Jars (savings) section, and recent activity grouped by day.
- Transactions command: full history with day grouping, keyword search and filters (incoming, outgoing, completed, this month).
- Menu bar command: at‑a‑glance balance with 10‑minute auto‑refresh and quick actions.
- Offline fallback: shows the last successful snapshot with a stale indicator if a network call fails.
- Built‑in rate‑limit protection: detects `429` responses and enters a short cooldown to avoid hammering Wise's API.
