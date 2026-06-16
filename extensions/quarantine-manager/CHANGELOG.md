# Quarantine Manager

## [Multi-target selection] - 2026-06-16

### Fixed

- Removing quarantine from several apps no longer triggers a separate admin prompt per app. You can now select **multiple** files/apps/folders at once (in the picker or via the Finder selection); they're scanned into one list and cleared in a single pass with at most one admin prompt.

### Added

- The picker remembers your **last selection** and defaults to it, so re-checking the same folder is one keystroke (`⌘R` to re-scan).

### Changed

- The per-row Select/Deselect toggle moved from `⌘S` to `⌘↵`, matching Raycast's uninstall command.

## [Single command with batch select] - 2026-06-10

### Changed

- Merged **Check Quarantine Status** and **Remove Quarantine** into a single **Manage Quarantine** command — inspect attributes and clear quarantine from the same view, no command switching

### Added

- Uninstaller-style multi-select for directory scans: every quarantined item is a selectable row (all selected by default), with per-row toggle (`⌘S`), **Select All** `⌘⇧A` / **Deselect All** `⌘⇧D`, and a `N of M selected` counter
- **Remove Quarantine from Selected** (the primary Enter action) clears the chosen files in a single pass (one admin prompt at most), instead of all-or-nothing recursive removal
- Sort scanned items by path, source, or download date
- Clean folders/apps now report scan scope (e.g. "Scanned 248 items (immediate contents only) · 0 quarantined") instead of a bare "nothing found"

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
