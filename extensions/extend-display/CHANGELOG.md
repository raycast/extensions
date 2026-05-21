# Extend Display Changelog

## [Fix Sidecar Connection] - {PR_MERGE_DATE}

- Connect to iPads through SidecarCore, since the System Settings menu no longer starts Sidecar on macOS 26
- Keep the System Settings backend for non-Sidecar targets, with SidecarCore treated as optional
- Fix the stale Displays settings URL and make the display menu lookup more reliable

## [Bugfix] - 2026-03-09

Fixed display menu click failing on macOS Tahoe (26+).

## [Set as Quick Connect] - 2026-03-01

- Added "Set as Quick Connect" action to the display list (`Cmd+Shift+Q`)
- Quick Connect display is pinned to the top of the list
- Displays sorted by last connected, then alphabetically
- Quick Connect command now reads from the list selection, with fallback to extension preferences
- Fixed infinite spinner when display is unavailable by adding timeouts to AppleScript

## [Initial Release] - 2026-02-23

- Scan for available AirPlay/Sidecar displays from System Settings
- One-click connect/disconnect with state detection
- Audio preservation prevents audio from switching to the display
- Quick Connect command for instant toggle with configured display
- Local storage for display list with last connected timestamps
- Theme-aware icons for light and dark modes
