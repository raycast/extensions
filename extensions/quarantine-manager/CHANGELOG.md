# Quarantine Manager

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
