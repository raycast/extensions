# YouTube Music Changelog

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
