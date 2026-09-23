# BCUninstaller Changelog

## [Simplify Uninstall Flow and Fix Reliability Issues] - 2026-08-08

- Made the app list easier to use
- Added a button to close running apps before uninstalling them
- Fixed quiet uninstall detection
- Added Ctrl+R to refresh the app list
- Bring Raycast back after BC Uninstaller is done

## [Initial Release] - 2026-07-24

- Add a Windows-only Raycast command for browsing installed applications through BCUninstaller
- Add queue-based batch uninstall support
- Add an optional preference for automatic high-confidence leftover cleanup
- Force-refresh the application list after BCUninstaller finishes uninstalling and cleanup
- Cache application discovery so repeat launches load immediately
