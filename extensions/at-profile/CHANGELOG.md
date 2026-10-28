# @ Profile Changelog

## [Open counts, History of 100, and Import/Export fixes] - 2026-10-28

- History shows how many times you've opened each profile, and keeps your last 100 profiles instead of 20
- Stars are now Favorites: "Add to Favorites" in History, shown with a star in the extension's colors
- Export Apps saves right away and tells you where, with Show in Finder and Copy Path
- New Export Directory preference sets where exports go (Downloads by default), and an export never replaces an existing file
- Import Apps opens a file picker, pre-filled with the file selected in Finder, and imports only when you press Import
- Import keeps open counts and says what changed, including apps it showed or hid, e.g. "No apps added (2 already set up) · History unchanged", including when the file comes from a newer version
- Import and Export moved into the Manage Apps action menu (⌘⇧I and ⌘⇧E)
- Editing a custom app's URL keeps its History, favorites and visibility
- Copy Profile URL no longer doubles the @ on Threads, TikTok and YouTube Brand profiles
- Opens, favorites and imports made at the same moment from different commands or AI tools no longer overwrite each other
- A damaged saved setting no longer breaks every command
- Open Profile picks up apps you add, edit or hide in Manage Apps without relaunching
- Edit Profile returns to History instead of closing the extension
- History's actions show the service's icon on "Open @profile on …"

## [Added starring and YouTube brand profiles] - 2026-02-16

- Added starring functionality for profile history
- Added AI tool support for starring and unstarring profiles
- Updated action shortcut keys to align with Raycast conventions
- Added YouTube brand profile support (@brand)
- Updated dependencies and ESLint configuration

## [Prevent Infinite Loop in Open Profile and add Screenshots] - 2025-08-08

### Added

- **Screenshots**: Added screenshots to for Raycast Store

### Fixed

- **Infinite Loop**: Fixed infinite loop in Open Profile

### Changed

- **Raycast API**: Updated Raycast API to v1.102.3

## [Profile History and Custom Apps] - 2025-08-07

### Added

- **New "Open Profile" Command**: Open a profile from a dynamic list of Apps, or choose from a handy list of recent profiles
- **New "History" Command**: Displays a list of recently opened profiles filterable by App
- **New "Manage Apps" Command**: Allows users to enable and disable apps or add custom apps
- **Import/Export**: Allows users to import and export their settings, history, and profile history

### Changed

- Updated "Quick Profile" Command to use editable list of Apps in `./src/utils/default-apps.ts`

## [Enhanced Platform Management] - 2025-01-07

### Added

- **New "Manage Apps" Command**: Renamed and enhanced platform management interface
- Dynamic platform loading - no more hardcoded dropdown values
- Real-time platform status updates with enable/disable functionality
- Comprehensive YAML import/export for settings backup and sharing
- Enhanced documentation with screenshots and feature explanations

### Changed

- Improved app management interface with better organization
- Improved user interface with clearer section titles
- Updated README with comprehensive feature documentation

## [Fixes] - 2025-05-12

- Fixed Twitter and X to lead to X [#18534](https://github.com/raycast/extensions/issues/18534)

## [Add AI Tool] - 2025-03-10

This release adds the AI functionality and TikTok as site option.

## [Initial Version] - 2024-08-13
