# Slugify File / Folder Names Changelog

## [1.1.0] - 2025-08-07

### Added
- **Transliterate German Umlauts**: New preference setting to enable proper German umlaut transliteration
  - `ä` → `ae` (instead of `a`)
  - `ö` → `oe` (instead of `o`)  
  - `ü` → `ue` (instead of `u`)
  - `ß` → `ss` (unchanged)
- **Command Preferences**: Added configurable preferences accessible via `⌘,` shortcut
- **Comprehensive Test Suite**: Added extensive test cases for German umlaut handling
- **Backward Compatibility**: German umlaut transliteration is disabled by default to maintain existing behavior

### Enhanced
- **Documentation**: Updated README with detailed German umlaut transliteration examples and preference instructions
- **Error Handling**: Improved TypeScript compilation and dependency management

## [Updated extension icon] - 2025-06-18

## [Initial Version] - 2025-05-30

- Initial release
- International character support
- Batch file processing
- Extension preservation
- Conflict resolution
- Clipboard integration
