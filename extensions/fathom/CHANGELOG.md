# Fathom for Raycast Changelog

## [Download Recordings] - 2026-09-20

### Added

- **Download Recording**: Save a meeting's recording to your export directory (⌘⇧D). Recordings are typically 250–650 MB, so the transfer runs in a background process that **keeps going after you dismiss Raycast** — reopen the command to see where it got to.
- **Copy Download Link** (⌘⇧L): Copy a direct link to the recording. The link is signed and expires within 24 hours.
- **Resumable transfers**: An interrupted download resumes from where it stopped instead of starting over, and a cancelled one leaves no partial file behind.
- **Live progress**: Percentage, transferred size, speed, and time remaining, with a Cancel action throughout.
- **Transcript search reaches the whole transcript.** Transcripts moved to disk with a compact index in storage, and a word appearing later in a long meeting fell outside it. Search now consults the transcript on disk whenever that index cannot answer.
- **Search Older Meetings** (⌘L): search covers the meetings loaded so far, so a match further back can be missing. This fetches another batch of older meetings on demand, and the empty state now says when there is more to look through rather than reporting no results.

### Changed

- Failure notifications now carry a **Copy Error** action, so a problem can be reported with its details attached.
- Keyboard shortcuts are now platform-explicit (macOS and Windows) rather than ambiguous.
- Export Summary as Markdown moved to ⌘⇧M (⌘⇧S conflicted with a system shortcut).

## [Instant Display, Stop Fetching & Cache Performance] - 2026-02-25

### Added

- **Instant meeting display**: First page of meetings appears immediately on launch; remaining pages load in the background without blocking the UI
- **Stop Fetching**: Background fetch toasts now include a "Stop Fetching Meetings" button to abort mid-pagination
- **HUD on copy**: Copying a meeting's share link now shows a native HUD notification confirming the copy

### Changed

- **Batch cache writes**: Meetings are now written to LocalStorage in parallel instead of sequentially, significantly reducing cache write time
- **Bulk cache reads**: `getAllCachedMeetings` now uses `LocalStorage.allItems()` for a single bulk read on launch instead of N individual reads
- **Separate abort tokens**: `fetchRemainingPages` and `loadMoreMeetings` each have their own abort token, preventing them from accidentally cancelling each other
- **Cleaner error display**: Refactored `search-meetings` error view into `getErrorDisplay()` helper and `ErrorEmptyView` component

### Fixed

- **Spurious "Stopped" toast**: Fixed a token collision where triggering "Load More" would falsely abort the initial background fetch and show a green "Stopped" toast

## [Lazy Pagination & Smart Cache] - 2026-02-19

### Added

- **Lazy pagination**: Load ~50 meetings initially, then fetch 50 more via native Raycast List pagination on scroll
- **Smart cache refresh**: 5-minute staleness detection for automatic background refresh
- **Full-text search**: Search across meeting titles, summaries, and transcripts
- **Cursor-based pagination**: Maintains position across sessions for incremental loading
- **Native pagination UX**: Removed manual "Load Older Meetings" action in favor of Raycast List pagination

### Changed

- **Direct HTTP API**: Removed `fathom-typescript` SDK dependency for better control
- **Improved toast messages**: Clearer distinction between "Fetching from API" and "Saving to cache"
- **Instant loading**: Cached meetings display immediately while fresh data loads in background
- **Cache architecture**: New `cacheManager.ts` with pagination state and staleness tracking
- **Removed extraneous docs**: Relocated leftover docs that are no longer relevant
- **Pagination `pageSize`**: Corrected from `50` to `20` to match Raycast's documented intent (placeholder skeleton count, not data batch size)
- **Pagination `hasMore` initial state**: Initialized synchronously from `cacheManager.hasMore()` so Raycast sees the correct value on first render, preventing the pagination trigger from being suppressed
- **Updated `@raycast/api`** to `1.104.6`

### Fixed

- **Performance**: Eliminated redundant API calls on every search/launch with 5-min cooldown
- **UX clarity**: Toast messages now clearly indicate what's happening (fetching vs caching vs ready)
- **SDK issues**: Resolved SDK validation failures by using direct HTTP requests
- **Code duplication**: Extracted shared `CachedMeetingData → Meeting` mapping into a single `toMeeting` helper in `useCachedMeetings`
- **Redundant state**: Removed duplicate `hasMoreMeetings` state and `isLoadingMoreRef` from `search-meetings.tsx` (already handled in the hook and `cacheManager`)

## [Update] - 2026-02-10

- Updated dependencies
- Removed `calendarInvitees` parameter from SDK call with explanatory comment about HTTP fallback

## [Improve Full-Text Search] - 2025-12-25

- Fixed `get-meeting-details` tool to paginate through all meetings when searching by title
- Changed "Refresh Cache" shortcut to use `Keyboard.Shortcut.Common.Refresh` for Raycast consistency

## [Update to Fathom SDK 0.0.36] - 2025-11-09

### Changed

- Updated `fathom-typescript` dependency from 0.0.30 to 0.0.36
- Improved SDK integration with better error handling and validation
- Added fallback to HTTP requests when SDK validation fails

### Fixed

- Fixed TypeScript type safety issue with async iterator responses in `listMeetings`
- Enhanced error handling for edge cases in API responses

## [Initial Version] - 2025-10-19
