# Microsoft OneDrive Changelog

## [Improvements] - 2026-02-05

### Added

- The **Upload to Current Directory** action now supports uploading entire directories, preserving the folder structure.
- Added conflict detection when uploading items that already exist in the destination, with options to **Keep Both** or **Stop**.

### Changed

- Renamed **Upload to Current Folder** action to **Upload to Current Directory** to improve terminology consistency.

## [Improvement] - 2026-02-04

### Changed

- Updated icon for the **Sort Search Results By** action.

## [Improvement] - 2026-01-31

### Changed

- Improved UX by limiting the search scope in the **Search Files** command to the current directory and its subdirectories.

## [Fixes and Improvements] - 2026-01-19

### Changed

- Updated the checkmark icon used in the **Sort Search Results By** action to improve design consistency.
- Adopted the default icon for the **Create Quicklink** action.

### Fixed

- Fixed an issue where unnecessary API calls were made during initialization when reopening the extension with a previously selected SharePoint library.

## [Improvement] - 2026-01-15

### Added

- Users can now find the **Search Files** and **My Recent Files** commands when searching for *SharePoint*.

## [Initial Version] - 2026-01-14