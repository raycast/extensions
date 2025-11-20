# Changelog

All notable changes to hyperDASH will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-18

### Added
- **TaskNotes 4.0.1 Compatibility**
  - Recurrence support with `recurrence` and `recurrence_anchor` fields
  - Alphabetical priority sorting (use `1-urgent`, `2-high`, `3-medium`, `4-low`)
  - Time tracking with `time_tracked` and `time_estimate` fields
- **Display Preferences**
  - Toggle recurrence info display
  - Toggle priority display
  - Toggle time tracking display
- **Performance Optimization**
  - Configurable maximum results (default: 500)
  - Smart sorting: Priority → Due Date → Modified Time
  - Optimized for large vaults (30,000+ tasks)
- **Visual Updates**
  - New retro minimalist icon with terminal green aesthetic
  - Auto-incrementing build script

### Changed
- Updated package metadata for Raycast Store submission
- Enhanced README with comprehensive TaskNotes 4.0.1 documentation
- Improved task sorting algorithm

### Fixed
- React/TypeScript compatibility issues
- Build configuration for proper module resolution

## [0.3.0] - Previous Version

### Added
- Initial task and project management functionality
- Obsidian Bases plugin integration
- Tag-based filtering
- Multiple status support (todo, in-progress, next, hold, waiting, someday)

---

## Upcoming Features

Ideas for future releases:
- Quick add task command
- Bulk status updates
- Custom keyboard shortcuts
- Integration with Obsidian Daily Notes
- Task templates
