# YouTube Music Changelog

## [Search and Play] - {PR_MERGE_DATE}

- Added: `Play Music` command — search YouTube Music from Raycast and start the chosen track in the selected browser.
- Added: `Play Next` and `Add to Queue` actions, using the app's own search page and row menu. The tab returns to where it was afterwards and playback is not interrupted.
- Added: a source selector in `Play Music` for songs, albums, artists, playlists, YouTube videos, or songs and videos together. Video results open the watch page; album and playlist results start the queue through the app's own play endpoint.
- Added: albums, artists, and playlists as grid tiles, while songs and videos keep the list layout.
- Added: a library panel in `Play Music` — Albums, Artists, Playlists, Liked songs, and Recently played, each opening into its own list. It is read from the signed-in music tab; if that tab is missing or signed out, the panel says which and offers to reload.
- Added: a `Search in…` action that changes the search scope from the action panel, including mid-search, and a `source` launch context so a Quicklink or hotkey can open the command already scoped.
- Added: `Browse Tracks` on album and playlist rows, opening the collection's track list with filtering instead of only playing it from the start.
- Added: a `mode: "add"` launch context for `Play Music` that leads with `Add to Queue`, and an `Add to Queue…` action in `Now Playing` that uses it.
- Added: a `Retry Search` action when a search fails or returns nothing.
- Added: `Now Playing` command — artwork, progress, the last five tracks and the rest of the queue, with transport, rating and remove-from-queue actions.
- Added: a preference for how many recently played tracks `Now Playing` lists.
- Added: in-app navigation through the music app's own `yt-navigate` event, so app windows do not show a "Leave app?" prompt before loading a track.
- Added: a watcher that dismisses the "Are you still there?" prompt and resumes playback.
- Changed: upgraded to `@raycast/api` 2.8.2.

## [Fix AppleScript Error Handling] - 2026-08-15

- Fixed: `runJSInYouTubeMusicTab` now wraps `runAppleScript` in a try/catch block — previously, any AppleScript error (permissions, browser not running, invalid browser selection) was thrown unhandled and swallowed by empty catch blocks in commands, resulting in silent failures or "Unknown Error" HUD messages.
- Added: `handleAppleScriptError` function that detects specific failure modes:
  - "Allow JavaScript from Apple Events" not enabled
  - macOS Automation permission denied
  - Browser not running or unsupported
  - Generic AppleScript failures
- Added: Fallback HUD messages in all command catch blocks — commands now always show feedback instead of silently failing.
- Updated: `@raycast/api` dependency from `^1.35.1` to `^1.104.0` for compatibility with current Raycast versions.

## [Refactor Commands and Improve Error Handling] - 2026-02-20

- Refactored: Extracted inline JavaScript from all commands into exported constants/functions for better testability and readability.
- Refactored: Standardized all JS snippets to return descriptive string identifiers (e.g. `"like-clicked"`, `"dislike-not-found"`) instead of boolean values.
- Refactored: Replaced ad-hoc result handling with consistent `switch` statements across all commands, providing specific HUD feedback for every outcome.
- Refactored: Moved chapter-navigation JS (`goToChapter`) out of `utils.ts` into individual command files (`next-chapter.tsx`, `previous-chapter.tsx`) with more granular error states.
- Improved: `runJSInYouTubeMusicTab` now throws on errors and shows actionable toasts (with links) instead of silently returning `undefined`.
- Improved: Hardened JavaScript tab execution — commands now show a clear HUD message instead of failing silently when "Allow JavaScript from Apple Events" is not enabled or no matching tab is found.
- Cleaned up: Removed unused types (`ErrorMessages`, `OsaError`) from `utils.ts`.

## [New Command and Fix] - 2025-04-28

- Fixed: Like command no longer removes like when song is already liked
- Added: New command to remove like from currently playing song

## [New Commands] = 2024-03-06

Add `fast-forward`, `rewind`, `next-chapter`, `previous-chapter`, youtube.com support.

## [Search Command] = 2022-08-18

Add `search` command

## [Initial Version] - 2022-05-22
