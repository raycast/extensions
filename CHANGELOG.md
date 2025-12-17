# Changelog

## [Favicon Reliability Improvements] - 2025-12-17

- New: Refresh Favicon action (`⌘R`) to manually re-fetch website icons
- New: Multi-source favicon fetching — races 6 sources in parallel with 2s timeout, first response wins
- New: URL "dot" text auto-conversion — `discorddotcom` → `discord.com`, `jadotmt` → `ja.mt`
- Fixed: Cached favicons validated for existence and size before display
- Fixed: Missing favicons now show Globe icon instead of empty gray boxes
- Refactored: Centralized toast helpers (`toastSuccess`, `toastFailure`, `toastLoading`) for consistent UX
- Refactored: URL collection now uses O(1) Map lookups instead of O(n) array finds
- Refactored: Removed dead code (`getFaviconUrl`) and unused imports

## [New Icon and Improved Color Input] - 2025-12-16

- New: Updated extension icon with fresh folder design
- New: CSS color names supported (e.g., `red`, `coral`, `skyblue`) — auto-converted to hex
- New: Shorthand hex codes supported (e.g., `CCC` → `#CCCCCC`)
- Refactored: Extracted CSS colors to dedicated module
- Refactored: Created `useCopyUrls` hook eliminating duplicate code

## [Copy URLs, Move Items, and More] - 2025-12-16

- New: Copy as Markdown — copies all URLs with nested folder structure and bullet points
- New: Copy as List — copies all URLs sorted by length, one per line
- New: Move to Folder — move any item to a different folder from the action panel
- New: Edit nested folders directly from within a parent folder using `⌘E`
- New: Create New Folder option in Add Items form dropdown
- New: Import Folders action available when folder list is empty
- Fixed: Nested folder icons now display correctly in folder pickers
- Fixed: Preview pane now works inside folder contents view
- Improved: Refactored shared logic into `useNestedFolderCreation` hook
- Improved: Consolidated cache invalidation for better performance

## [Markdown Link Syntax for URLs] - 2025-12-16

- New: Use `[Custom Title](https://url.com)` syntax when adding URLs
- New: Plain URLs continue to auto-fetch page titles
- New: Custom titles are preserved when editing folders

## [Export and Import Backups] - 2025-12-16

- New: Export This Folder — saves folder with all nested content to Downloads
- New: Export All Folders — creates complete backup of all folders
- New: Import Folders — restore from JSON with merge or replace options
- New: Exports include preferences (sort order, view type, preview pane)
- New: Backup data is also copied to clipboard for easy sharing
- Improved: Action panels organized with semantic section headers (Open All, Organize, Quicklinks, Backup, Danger Zone)

## [Website Support and Enhanced Management] - 2025-12-16

- New: Add website URLs to folders with automatic favicon fetching
- New: Auto-fetch page titles for added URLs
- New: Local favicon caching for fast loading
- New: Edit website names and URLs inline
- New: Open All Websites action to launch all URLs at once
- New: Create Folder shortcut (`⌘N`) from the folder list
- New: Duplicate detection with add or skip options
- New: Duplicate Item and Remove Duplicates actions
- New: Separate sections for apps, websites, and folders
- New: Quick Add form for adding apps, websites, and folders in one step
- Changed: Merged Manage Folders command into main Folders command
- Changed: Simplified preview pane to single toggle preference
- Fixed: Form flickering when editing folders with websites
- Fixed: Preview pane not updating after removing items
- Fixed: Navigation inconsistencies when editing folders

## [Initial Release] - 2025-12-15

- Custom folders to organize applications into collections
- Nested folder support for hierarchical organization
- Custom icons from 100+ Raycast icons
- Custom hex colors for folder icon tinting
- List view and Grid view options
- Preview pane showing folder contents
- Multi-level sorting (primary, secondary, tertiary)
- Quicklink creation with custom folder icons
- Deeplink support for scripting and automation
- Open All Applications action
- Quit All Running Applications action
