# Token Track Changelog

## [Dashboard overhaul and performance] - {PR_MERGE_DATE}

- Rework dashboard around **Week** and **Month** calendar periods (Monday → today, 1st → today); removed the Today row.
- Add a dedicated **Budget** row with native weekly (Codex) or monthly (Claude, Cursor) caps and an SVG progress bar in the detail panel.
- Remove data-path preferences; providers read from standard macOS locations (`~/.codex`, `~/.claude`, `~/Library/Application Support/Cursor`).
- Stream usage metrics on the dashboard path to stay within Raycast's memory cap; defer per-chat lists to **View Details** (lazy load).
- Add 60s in-memory usage cache and persistent `useCachedPromise` snapshot; manual refresh clears both.
- Improve Cursor hybrid loading: API totals on the dashboard, SQLite + API attribution for conversation breakdown.
- Redesign token charts as SVG bar charts with rounded tops, nice axis ticks, and single-chart rendering for the selected period.
- Fix Codex chat titles using `session_index.jsonl` thread names.
- Guard currency formatting against invalid ISO codes; omit trailing `.00` on whole-dollar amounts.
- Fix week totals undercounting when the week starts before the current month.

## [Initial Release] - 2026-06-05

- Track token usage and estimated spend across Claude Code, Codex, and Cursor.
- View per-conversation usage details, token charts, and configurable budgets.
