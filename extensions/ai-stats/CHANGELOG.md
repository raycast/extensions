# AI-Stats Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added

- Unified command: `View AI Stats` (single entry point for Search and Leaderboards)
- Search-first view, ordered by most recent (`last_seen desc`)
- Model Detail pages with overview, pricing, throughput/latency, benchmarks, and raw JSON
- Creator filtering
  - Top bar dropdown and Cmd+P submenu
  - Inline hint with one-click Clear
- Reset Filters action (Cmd+Backspace) clears search text and creator filter
- Pinned models
  - Pin/unpin from list and detail
  - Pinned section at top (preference toggle)
  - Reorder pins (Move Up/Down), max 10, persistent across sessions
- Preferences
  - `SHOW_PINNED_SECTION` to show/hide the Pinned section
