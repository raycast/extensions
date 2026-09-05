# AI Usage Monitor Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Unified dashboard showing Claude Code and Codex session, weekly and per-model limits on one screen
- Background monitor with configurable session, weekly and reset-warning thresholds
- Notifications via Raycast HUD and/or macOS Notification Center, once per threshold per window
- Live usage summary in Raycast's root search
- Graceful degradation: a missing or signed-out provider explains itself without hiding the other
