# Changelog

All notable changes to this project will be documented in this file.

## [Initial Release] - {PR_MERGE_DATE}

### Added

- Add Destinations adds valid Finder selections in one step.
- Folder Routes creates a local Destinations CSV automatically and keeps it updated for Add and Manage changes.

### Changed

- Rename the extension to Folder Routes.
- Rename commands to Add Destinations and Overwrite Destinations from CSV.
- Make Add Destinations a one-step command using defaults configured in the extension preferences.
- Store the default destination CSV in Folder Routes' Application Support directory.
- Allow a header-only CSV to clear the destination library during manual synchronization.
- Five macOS Raycast commands for copying, moving, managing, importing, and synchronizing Finder destinations.
- Versioned Raycast LocalStorage repository for destination data.
- Search across destination names, paths, and aliases with pinned destinations first.
- Conflict behaviors for Prompt, Skip, Overwrite, and Keep Both.
- Cross-volume move fallback and overwrite backup/rollback handling.
- Add, edit, delete-with-confirmation, pin/unpin, reveal, JSON export, and bulk import management.
- Quoted CSV and JSON parsing with preview, validation counts, duplicate detection, missing-folder checks, conflict strategies, and atomic persistence.
- Keep imported destination libraries synchronizable by offering Skip or Replace for duplicate entries.
- Manual source-of-truth CSV synchronization with a file preference, strict validation, and all-or-nothing replacement.
- Focused tests for parsing, validation, duplicate handling, sorting, merging, and conflict naming.
- Setup, usage, privacy, import format, limitation, and Store asset documentation.
