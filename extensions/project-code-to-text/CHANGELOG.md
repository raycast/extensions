# Changelog

## [Update] - 2026-01-20

### Fixed
- Fixed memory leaks when updating file metadata in generated files
- Improved error handling when reading and writing files to prevent crashes if files become unavailable during processing
- Fixed timing issue with Finder selection that could cause incorrect file selection
- Improved handling of files on different drives and symbolic links for better cross-platform compatibility

### Improved
- Optimized file scanning to reduce duplicate operations and improve processing speed for large directories
- Enhanced error messages with clearer explanations and actionable recommendations when processing fails
- Unified error handling across the extension for more consistent behavior and better user feedback
- Refactored internal code structure for improved maintainability and reliability

## [Update] - 2025-12-16

### Fixed
- Fixed memory issues (JS heap out of memory) by implementing streaming file processing
- File contents are now formatted and written to output immediately, reducing memory usage by 50-70%
- Improved safety limit checks with better error messages and earlier validation

## [Update] - 2025-12-02

### Added
- Multiple file and directory selection support in the file picker
- Copy to clipboard option for generated content
- Token estimation display in file metadata and notifications
- Preview statistics showing estimated file size and token count before generation
- Results screen after successful generation with file information and quick actions

### Improved
- File picker now supports selecting both files and directories simultaneously
- Multiple Finder selection handling for better UI feedback
- Output file location logic for multiple selected items

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
