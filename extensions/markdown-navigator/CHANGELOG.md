# Markdown Navigator Changelog

## [Fix Markdown File Indexing] - 2026-04-24

### Fixed

- Fixed incomplete Markdown file indexing by recursively scanning supported Markdown files instead of relying on Spotlight search results.
- Fixed search missing files beyond the initial 50-file load by searching across the complete indexed file list.
- Fixed refresh behavior to clear stale cached file indexes before reloading files.
- Fixed broad folder indexing to skip macOS user Library folders and VS Code history files without excluding regular note folders named `Library`.
- Fixed indexing resilience so a single deleted or inaccessible Markdown file no longer clears the whole file list.

### Changed

- Removed the "Load More Files" flow; large file collections now use pagination over the complete Markdown index.
- Changed recursive folder indexing to use asynchronous filesystem reads.

## [Maintenance] - 2025-05-16

- Remove duplicate files

## [1.0.1] - 2025-03-17

### Fixed

- System tag's color display issue

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
