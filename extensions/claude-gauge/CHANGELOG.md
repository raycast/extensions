# Claude Gauge Changelog

## [Initial Release] - 2026-06-29

- **Claude Session** command: Claude subscription 5-hour and 7-day limits with
  color-coded utilization gauges, reset countdowns, and live active-block token /
  cost / burn-rate / runway details plus a weekly tokens-and-cost summary from
  `ccusage`. Reads a local status line cache file and degrades gracefully when it
  is missing or stale.
- **Non-destructive status line installer**: a Session action that backs up
  (`.bak`) and patches your existing `statusline-command.sh` with a clearly
  marked capture block, plus an uninstall action that removes it.
- **Claude API Usage** command adapts to your key:
  - **No key** — local Claude Code spend estimate from `ccusage` (This Month /
    Today, per model, Claude-only filter, optional monthly-budget gauge); no
    network call.
  - **Standard key** (`sk-ant-api…`) — the same local view plus an on-demand
    **Rate-Limit Headroom** probe (a single minimal request).
  - **Admin key** (`sk-ant-admin01-…`) — real billed organization usage and cost
    from the Anthropic Admin API (Today and Month-to-Date, per model, paginated),
    with optional KRW conversion.
- **Per-key isolation**: an "API Usage Config Dir (per-key)" preference points the
  local spend view at a dedicated `CLAUDE_CONFIG_DIR` so it counts only that key's
  Claude Code logs.
- Keyboard-first: ⌘R Refresh on every screen; ⌘T toggles Today / This Month (local
  view); ⌘I toggles per-model details (admin view); ⌘⇧C copies raw rate limits
  (Session). The API key is stored in the macOS Keychain.
