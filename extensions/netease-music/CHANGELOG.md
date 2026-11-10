# Netease-Music Changelog

## [Add Dislike and Next Track Command] - 2026-07-29

- Added a command to dislike the currently playing track and skip to the next track.

## [Add New Commands] - 2025-12-17

- Added support for more operations, including toggle playing state, volume up/down, toggle lyrics.

## [Initial Version] - 2022-04-14

## [Fix App Startup and Playback Commands] - {PR_MERGE_DATE}

This iteration was prepared on 2026-11-10. The plan was to handle app startup and remove the controller's one-second timeout.

- Commands now launch NeteaseMusic when needed and wait for its controls before acting.
- The extension now uses a shared AppleScript runner with a 30-second timeout instead of the previous controller dependency.
- Toggle Play/Pause now shares the same error handling as the other commands.
- Permission and timeout errors now show actionable failure messages.
- Regression tests and local Raycast testing instructions now cover the updated command path.

Five automated regression tests, TypeScript checks, Raycast lint and build checks, and AppleScript compilation passed. Actual playback and startup behavior remain pending manual testing in Raycast.

## [Name Completed Commands in Success Messages] - {PR_MERGE_DATE}

This iteration was prepared on 2026-11-10. The plan was to replace the generic success message with the executed command's title. Each command now reports its own title, and the existing Play regression test checks the displayed message. Wei confirmed that commands automatically open NeteaseMusic during local manual testing.

Submission checks on 2026-11-10 passed all five regression tests, TypeScript checks, Raycast lint and build checks, and formatting checks. The submission includes only the app startup fix, shared timeout and error handling, command-specific feedback, and supporting tests and documentation.

Upstream synchronization on 2026-11-10 preserved the existing Dislike Track & Next Track command and dependency security updates. The compound command now uses the shared runner and reports one completion message. All seven regression tests, TypeScript checks, Raycast lint and build checks, and formatting checks passed after installing the synchronized lockfile dependencies.
