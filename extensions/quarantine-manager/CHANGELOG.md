# Quarantine Manager

## [Scan apps and folders] - 2026-06-08

### Added

- Scan directories for quarantined files: `.app` bundles are scanned recursively (they often contain many internal quarantined files), while plain folders are scanned one level deep so large trees stay responsive
- **Check Quarantine Status** lists every quarantined item found inside an app or folder
- **Remove Quarantine** shows an aggregate summary and clears `com.apple.quarantine` from a whole bundle or folder at once (recursive), plus a recursive "Remove All Attributes" option

## [Initial Release] - 2026-03-12

### Added

- **Remove Quarantine** command — view quarantine status and remove `com.apple.quarantine` attribute with one action
- **Check Quarantine Status** command — inspect all extended attributes on any file in a detailed list view
- Auto-detects currently selected file in Finder (skips file picker if already selected)
- Parses quarantine data to show download source app and timestamp
- Admin privilege fallback for protected files
- Copy `xattr` terminal command to clipboard
- Remove all extended attributes option
- Color-coded status badges (quarantined vs clean)
