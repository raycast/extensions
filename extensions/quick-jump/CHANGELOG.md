# Quick Jump Changelog

## [Enhancement] - 2026-01-24

### Added
- Nested placeholder expansion: placeholders can now reference other placeholders (e.g., `teamDir: "${baseDir}/team"`)
- Circular dependency detection with detailed error UI showing cycle path and fix instructions

## [Enhancement] - 2026-01-15

### Added
- Detail views for URLs and groups (Cmd+D) showing comprehensive information including URLs, tags, placeholders, templates, and search keywords
- Global placeholders support for template values shared across all templates
- Performance optimizations with keyword and domain caching

### Fixed
- Optimized keyword generation to reduce redundant function calls
- Removed unused imports and code redundancies

## [Added Quick Jump] - 2025-07-09

- Initial version code
