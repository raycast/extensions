# Sync Folders Changelog

## [Raycast 2 Compatibility] - 2026-08-27

### Fixed

- Fixed the menu bar icon rendering as a solid black square on Raycast 2: the command now uses the built-in `Icon.TwoArrowsClockwise` instead of the extension's full-colour icon, which Raycast 2 could not render in the menu bar
- Fixed the **Massive Sync** submenu icons being invisible on Raycast 2: its assets draw with SVG strokes, which the menu bar renderer ignores, so they now ship as PNGs

### Changed

- Updated to `@raycast/api` 2.x and `@raycast/utils` 2.x
- Migrated ESLint to the flat config format

## [Security & Bug Fixes] - 2026-04-12

### Security

- Fixed command injection vulnerability: replaced `exec` with `execFile` and argument arrays in rsync execution

### Bug Fixes

- Fixed "Folders synced" HUD showing before rsync actually completes — now awaits the result
- Fixed `updateLastSync` called before sync finishes — now only updates on success
- Fixed typo "should't" → "shouldn't" in validation messages
- Fixed toast message "Deleted Reminder" → "Deleted Sync Folder"
- Fixed copy-paste variable name `drinkTypes` → `filterTypes` in dropdown filter
- Replaced loose equality (`==`) with strict equality (`===`)

### New Commands

- **Sync History** — View the history of all synchronizations with timestamp, duration, file count, and success/failure status

### New Features

- **Dry Run** (⌘D) — Preview what rsync would do without making changes. Shows new, updated, and deleted files
- **Exclude Patterns** — Comma-separated patterns to exclude from sync (e.g. `.DS_Store, *.tmp, node_modules`)
- **AI Advice** (⌘⇧A) — Get AI-powered analysis of dry-run results with safety assessment and recommendations (requires Raycast Pro)

### Improvements

- Promisified `executeRsync` — returns `RsyncResult` with success/error instead of using callbacks
- Used auto-generated `Preferences.SyncFinderSelectedFolders` type instead of manual interface
- Automatically exclude AppleDouble `._*` files from rsync to prevent errors on non-HFS+ volumes
- Fixed icon dropdown default value mismatch in Create Sync Folders form

## [Improvements] - 2024-11-25

- ✨ Improved images background color to match the Raycast theme

## [New features and improvements] - 2024-11-17

- Added an icon to the Sync Folders preset for improved visual identification and user experience
- Added "Duplicate" command to Sync Folders preset context menu, simplifying preset management and workflow efficiency
- Enhance sync folder list refresh performance and responsiveness after creating or modifying sync folders
- Eliminated unnecessary console logging to streamline development and improve performance

## [Initial Version] - 2024-11-12
