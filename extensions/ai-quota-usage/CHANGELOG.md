# AI Quota Usage Changelog

## [Initial Version] - {PR_MERGE_DATE}

- View command listing Claude Code and Codex, each with a quota + usage detail panel.
- Codex live 5-hour and weekly quota (remaining % + reset countdown) from the
  `wham/usage` endpoint, using the current Codex login, with the local session-log
  snapshot retained as an offline fallback.
- Claude Code live quota (5-hour, weekly, per-model weekly) from the undocumented
  `oauth/usage` endpoint, read from Claude Code's own login (read-only — never refreshed).
  Expiry- and scope-aware: surfaces the exact reason (expired, missing scope, rate-limited)
  instead of throwing, caches good readings ~5 min, and reuses the last good one on a throttle.
- Usage/cost (today and this week, tokens + $) for both tools via the `ccusage` CLI.
- Preferences: low-quota warning threshold, data-directory overrides, custom npx path.
