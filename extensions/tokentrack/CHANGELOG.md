# Token Track Changelog

## [Budget Menu Bar] - 2026-06-07

- Add **Budget Menu Bar** command: glanceable spend vs cap for Claude Code, Codex, and Cursor with provider-colored progress bars.
- Opt-in command (`disabledByDefault`); run it once from Raycast to pin the menu bar item. Background refresh every 15 minutes (enable in command preferences).

## [Claude Code chat titles and Open Chat] - 2026-06-07

- Fix Claude Code conversation names to match the app sidebar: prefer `/rename` custom titles, then `ai-title` lines from session JSONL.
- Attribute subagent and forked-session usage to the parent chat so View Details totals match the dashboard.
- Fix **Open Chat** to resume the session via `claude://resume?session={uuid}&cwd={path}` (falls back to `claude://code/{uuid}`).

## [Quick usage commands] - 2026-06-06

- Add **Quick Usage Claude Code**, **Quick Usage Codex**, and **Quick Usage Cursor** no-view commands that show a toast with estimated spend against your configured budget cap.
- Rename main command to **Dashboard** (was Token Dashboard).

## [Remove budget alerts] - 2026-06-06

- Remove **Monitor Budgets** background command and threshold alert preferences (**Alert Threshold (%)**, **Enable budget alerts**).
- Budget caps, progress, and pace remain on the Token Dashboard only.

## [Open Chat] - 2026-06-06

- Add **Open Chat** as the primary action in View Details for Claude Code and Codex chats (deeplink into the desktop app; Claude falls back to the session folder in Finder when needed).
- Cursor View Details shows **Open Cursor** (app only) with a tooltip — no verified deeplink to jump to a specific chat yet.

## [Budget pace] - 2026-06-06

- Add a **Budget Pace** row under the budget cap showing daily burn, remaining spend allowance, and projected cap-hit date when spend is on track to exceed the limit before the period ends.
- Extend the budget detail panel with pace metadata (daily burn, daily allowance, projection).

## [Major dashboard update] - 2026-06-06

- Rework dashboard around **Week** and **Month** calendar periods (Sunday → today, 1st → today); removed the Today row.
- Add a dedicated **Budget** row with native monthly caps (Claude, Cursor) or a **rolling 7-day Codex window** (first-use anchored, matching Codex CLI) and an SVG progress bar in the detail panel.
- Show cost and token counts as colored list accessories; budget row shows spend and cap separately.
- Remove data-path preferences; providers read from standard macOS locations (`~/.codex`, `~/.claude`, `~/Library/Application Support/Cursor`).
- Improve first-time setup: **Currency** first, all budget fields required; budget titles follow the selected currency (no hardcoded `$`).
- Stream usage metrics on the dashboard path to stay within Raycast's memory cap; defer per-chat lists to **View Details** (lazy load).
- Add in-memory usage caching and persistent `useCachedPromise` snapshots; manual refresh clears dashboard, snapshot, and Cursor API caches.
- Keep showing last good Cursor charts when the dashboard API times out; reuse stale API and snapshot data instead of wiping totals on failed refresh.
- Improve Cursor hybrid loading: API totals on the dashboard, SQLite + API attribution for conversation breakdown; cache breakdowns for 15 minutes and reuse warm API data when opening **View Details**.
- Fix Claude Code chat titles to prefer `custom-title` (Plan mode, `/rename`) over background `ai-title`, with first-user-message fallback.
- Redesign token charts as SVG bar charts with rounded tops, nice axis ticks, and single-chart rendering for the selected period.
- Fix Codex chat titles using `session_index.jsonl` thread names.
- Round money to cents before display; omit trailing `.00` on whole-dollar amounts only (`$300`, not `$300.00`; `$1.50` keeps both decimals).
- Fix week totals undercounting when the week starts before the current month.
- Update extension icon and refresh store screenshots.

## [Initial Release] - 2026-06-05

- Track token usage and estimated spend across Claude Code, Codex, and Cursor.
- View per-conversation usage details, token charts, and configurable budgets.
