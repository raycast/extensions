# dmenu Changelog

## [Fixes & Security] - {PR_MERGE_DATE}

### Fixed
- Fixed broken installation that prevented the extension from running out of the box.
- Replaced the unauthenticated TCP loopback socket with a Unix domain socket in a private (`0700`) temp directory, with the socket file itself set to `0600`. Previously the port was visible to any local process via `ps aux`, allowing another process to read the item list or inject a fake selection.

### Added
- Guard in `dmenu.tsx` for missing/invalid launch arguments, so launching the Raycast command directly (instead of via the `dmenu` CLI) shows a friendly message instead of crashing.

## [Initial Version] - {PR_MERGE_DATE}
