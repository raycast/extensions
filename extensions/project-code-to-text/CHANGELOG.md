# Changelog

## [Update] - 2025-06-25

### Added
- An additional field for ignore patterns has been added to the form. Users can specify extra ignore patterns, separated by commas.

## [Update] - 2025-06-10

### Added
- Individual file selection with removable tag interface for processing specific files from Finder
- Support for Salesforce development files (`.cls` and `.trigger`) with proper syntax highlighting  
- Smart directory detection when multiple files are selected from different locations
- Toggle option to process entire parent directory instead of just selected files
- Form.TagPicker component for visual file selection interface

### Improved
- File/directory selection workflow with integrated interface in main form
- Path resolution logic for finding common parent directories across multiple selected files
- State management for different file processing modes
- Error handling and logging for Finder selection debugging

### Technical
- Updated `ALWAYS_TEXT_EXTENSIONS` to include `.trigger` and `.cls` file extensions
- Updated `LANGUAGE_EXTENSION_MAP` to map Salesforce files to "apex" syntax highlighting
- Implemented `analyzeFinderSelection()` function with proper path segment comparison
- Added `processOnlySelectedFiles` and `useDirectoryInsteadOfFiles` state flags

## [1.0.0] - 2025-06-03

### Added
- Initial release of Project Code to Text extension
- Directory selection with Finder integration
- File content aggregation with metadata
- Support for common programming languages and file types
- Gitignore rules respect
- Configurable output settings
- AI-optimized instructions toggle
