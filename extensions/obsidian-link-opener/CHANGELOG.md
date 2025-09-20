# Changelog

## [Caching, Ignore filters, Alias recognition, Memory optimization] - 2025-09-09

### Added

#### Smart Caching System
- Configurable TTL cache for instant results with large vaults
- Incremental file scanning that only re-reads changed files
- Partial file reading optimization for faster frontmatter parsing
- "Refresh Index" command to manually clear and rebuild cache
- Cache TTL preference setting (default: 5 minutes)
- Directory-based change detection for efficient cache invalidation
- Chunked cache storage for handling large vaults (2MB chunks)

#### Obsidian Ignore Filters Integration
- Support for Obsidian's native ignore filters from `app.json`
- Dynamic pattern recognition for regex, directory, and file exclusions
- Automatic conversion of Obsidian patterns to glob patterns

#### Frontmatter Aliases Support
- Search for notes using the frontmatter `aliases` property - notes can now be found by their aliases in addition to their titles

### Fixed
- Fixed "JS heap out of memory" error when indexing large vaults through:
  - Implementing chunked cache storage that splits large data into 2MB segments to avoid V8 string size limits
  - Adding batch processing with configurable batch sizes (default: 100 files) to control memory usage
  - Introducing dynamic memory monitoring that adapts batch sizes based on available heap space
  - Using partial file reading to extract only frontmatter instead of loading entire file contents
  - Implementing streaming JSON serialization for cache persistence
  - Adding proper cleanup of file handles and resources during scanning

### Changed
- Vault scanning now respects user-configured exclusions in Obsidian
- More flexible file and folder exclusion system
- Batch processing for file scanning to prevent memory exhaustion
- Dynamic memory monitoring with adaptive batch sizing

### Removed
- Deprecated `excludeFolders` preference (functionality moved to Obsidian's native filters)

### Performance Improvements
- 10-100x faster load times for large vaults after initial scan
- Significantly reduced memory usage through partial file reading
- Stable indexing for vaults with 10,000+ files

## [Added Obsidian Link Opener] - 2025-08-25

Initial release
