# Markdown Navigator Changelog

## [1.0.0] - 2025-03-16

### Added
- Initial release with fast file browsing and search functionality
- Tag filtering with color-coded system tags (Important, Draft, Complete, Review, Archive)
- Smart tag extraction from inline hashtags and YAML frontmatter
- File management actions (open, delete, move to trash, show in Finder)
- Multiple template options for new file creation (Basic, Meeting, Blog, Project, Empty)
- Context-aware file creation in current folder
- Progressive loading system for large file collections
- Pagination with keyboard shortcuts (⌘← and ⌘→)
- Folder organization with automatic grouping
- Tag management interface with dedicated search (⌘T)

### Changed
- Optimized initial loading to 50 files with incremental loading for better performance

### Fixed
- Proper handling of both English and Chinese tags
- Fallback mechanisms for file searching when preferred methods unavailable