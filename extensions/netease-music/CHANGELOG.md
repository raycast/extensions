# Netease-Music Changelog

## [Fix App Startup and Command Feedback] - {PR_MERGE_DATE}

- Commands now launch NeteaseMusic when needed and wait for its controls before acting.
- Commands allow more time for the app to respond, preventing the previous one-second timeout errors.
- Success messages now identify the command that completed.
- Permission and timeout errors now explain how to recover.

## [Add Dislike and Next Track Command] - 2026-07-29

- Added a command to dislike the currently playing track and skip to the next track.

## [Add New Commands] - 2025-12-17

- Added support for more operations, including toggle playing state, volume up/down, toggle lyrics.

## [Initial Version] - 2022-04-14
