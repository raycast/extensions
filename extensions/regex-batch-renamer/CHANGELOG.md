# Regex Batch Renamer Changelog

## [1.0.0] - 2025-06-26

### Added
- Initial release of Regex Batch Renamer extension
- Multiple regex-based rename job creation and management
- Two predefined job templates:
  - Slugify Filenames
  - Clean Filenames
- Batch processing of selected files and folders from Finder
- Preview functionality to see changes before applying
- Execution history tracking with detailed results
- Conflict resolution for duplicate filenames
- Multiple regex rules per job with individual descriptions
- Regex pattern validation
- Copy results to clipboard functionality
- Comprehensive error handling and user feedback

### Commands
- **Manage Rename Jobs**: Create, edit, delete, and duplicate jobs
- **Run Rename Job**: Execute jobs on selected Finder items
- **Create New Rename Job**: Quick access to job creation form

### Features
- Support for regex flags (global, case-insensitive, multiline)
- Capture group support ($1, $2, etc.) in replacements
- Real-time preview of changes on selected files
- Automatic backup numbering for conflicting filenames
- Local storage persistence for jobs and history
- Clean, intuitive UI following Raycast design patterns 