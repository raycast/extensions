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

### Fixed

- Show `isLoading` on the top-level `List` for better loading UX
- Switched data fetching to `useCachedPromise` for faster, cancel/race-safe loads
- Prevented initial empty-state flicker by starting section loading states and forwarding to `List`
- Adjusted tag colors for clarity:
  - Input price = Orange, Output price = Red, TPS = Green,
  - Leaderboard scores = Gold (less “all red” look)
- Action panel polish:
  - Added ellipsis to “Change Leaderboard…” submenu
  - Moved “Reset Filters” below “Filter by Creator”
- Code quality:
  - DRY’d list accessories into a shared helper
  - Stabilized callbacks for pin/unpin/move (useCallback)
  - Introduced typed metric registry for leaderboard sort order
  - Removed duplicate/unused state and imports; switched refresh to `revalidate()`
