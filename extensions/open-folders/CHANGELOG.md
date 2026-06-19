# Open Changelog

## [Code Quality & Bug Fixes] - 2026-05-12

### Bug Fixes
- Fixed crash when opening most recent download from an empty directory
- Fixed `parseInt` NaN handling in speed dial keyboard shortcuts (1-8)
- Fixed file icons not showing in List Downloads (was using filename instead of full path)

### New Commands
- **Open Trash** — Open the Trash folder in Finder
- **Recent Folders** — List of recently opened folders from this extension, with "Clear" action

### New Features
- **Quick Look** (⌘Y) — Preview files without opening them
- **Move to Trash** (⌃X) — Delete files directly from List Downloads
- **Pin Folders** (⌘⇧P) — Pin folders in List User Folders so they appear at the top
- **Subfolder Navigation** (⌘→) — Browse into subfolders without leaving Raycast
- **File Size** — Shown as accessory text in List Downloads
- **Show in Finder** and **Copy Path** (⌘C) actions on all items

### Improvements
- Extracted shared `SpeedDialGrid` component — eliminates code duplication between file and folder speed dials
- Extracted shared `FileList` component — unified List/Grid rendering for List Downloads and List User Folders
- Extracted shared `readDirectorySafe` utility — centralized directory reading with error handling
- Added `try-catch` around all directory reads with user-facing error toasts
- Used `path.join()` for proper path construction throughout
- Replaced loose equality (`!=`) with strict equality
- Removed unused `decs.d.ts` file
- Fixed inconsistent indentation in package.json
- Subfolder navigation now reads asynchronously with a loading state, so it no longer freezes Raycast on folders with thousands of entries
- Subfolder drill-down preserves the pin context, so folders can be pinned at any depth
- Pinned and Recent Folders lists auto-prune entries whose paths no longer exist on disk
- `Most Recent Download` command awaits its error toasts and `Recent Folders` releases the loading spinner on storage failures

## [Fixed the Folder and Files Speed Dial keyboard exception] - 2024-10-09

## [Fixes the Folder and Files Speed Dial commands] - 2024-06-27

- Fixed the Folder and Files Speed Dial commands to display the correct names for the folders and files.
- Minor typos and formatting fixes.

## [Initial Version] - 2024-04-22

- Speed dials for favorite files and folders.
- Instant open access to common folders Downloads, Documents, Desktop, and a Projects folder.
- Instantly open your most recently downloaded file.
- Quick access to recent downloads in the List Downloads Grid.
- Quick access to all folders in the User Home folder in the List User Folders Grid.
- All directories are user changeable for those who do not keep their files in the normal places!
- The List Grids can be changed to larger or smaller grids or a list view.
