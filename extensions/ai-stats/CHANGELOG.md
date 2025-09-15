# AI Stats Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added

- Universal pins: pin/unpin from Search, Leaderboards, and Detail share the same state and update instantly
- Leaderboards: Pinned section at the top with models sorted by the current metric order (asc/desc)
- Skeleton loading: lightweight placeholders for Search, Leaderboards main list, and the Leaderboards Pinned section
- Model Detail: preference `AFTER_PIN_BEHAVIOR` to return to list or stay on detail after pin/unpin
- Leaderboards: Search filtering by name, slug, or creator (preserves true rank)
- Leaderboards: Rank number shown to the left of each model name

### Changed

- Keyboard shortcuts (consistent across views)
  - Pin/Unpin: Option+Enter
  - Switch between Search and Leaderboards: Cmd+L
  - Change Leaderboard…: Cmd+P
- Start in Search always; Mode dropdown is controlled (no persistence)
- Leaderboards search bar placeholder updated to reflect filtering capability

### Fixed

- Eliminated flicker on metric changes with no-data filtering and no stale rows kept between leaderboard loads
- Debounced search cleanup avoids double-renders and memory leaks
- Detail view now fetches full model data by ID when opened from Leaderboards (which has partial columns)
- Pinned models no longer disappear during fetch; merge pinned from current slice with fetched pinned and keep previous data
- Smoothed cache revalidation: add ~120ms delay before showing parent spinner/skeletons; avoid duplicate initial fetch; apply same gating to Leaderboards to prevent quick-flash loading states

---

## Previous Notes

### Added (Previous)

- Unified command: `View AI Stats` (single entry point for Search and Leaderboards)
- Search-first view, ordered by most recent (`last_seen desc`)
- Model Detail pages with overview, pricing, throughput/latency, benchmarks, and raw JSON
- Creator filtering
  - Top bar dropdown and Cmd+P submenu
  - Inline hint with one-click Clear
- Reset Filters action (Cmd+Backspace) clears search text and creator filter
- Pinned models
  - Pin/unpin from list and detail
  - Pinned section at top
  - Reorder pins (Move Up/Down), max 10, persistent across sessions
- Preferences
  - `AFTER_PIN_BEHAVIOR` to control post pin/unpin navigation (see 1.1.0)

### Fixed (Previous)

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
  - Debounced search now cleans up pending timeouts to avoid potential memory leaks
  - Security: removed hardcoded Supabase credentials from source; configuration now resolves in this order:
    - Raycast Preferences (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
    - Environment variables (`DEFAULT_SUPABASE_URL`, `DEFAULT_SUPABASE_ANON_KEY`)
    - Built-in publishable read-only defaults for out-of-the-box use

### Data Source (Previous)

- Data is collected from [ArtificialAnalysis.ai](https://artificialanalysis.ai/) and mirrored into a read-only Supabase database for fast, reliable queries from Raycast.
- You can point the extension to your own Supabase by setting preferences (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) or environment variables. The hosted defaults remain the fastest and most reliable setup.
