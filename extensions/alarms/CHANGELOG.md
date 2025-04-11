# Changelog

## [1.1.0] - {PR_MERGE_DATE}
### Added
- Comprehensive test suite for integration and component tests
- New publishing checklist for Raycast Store compliance
- Clock emoji (⏰) for command and extension icons

### Changed
- Replaced JSON storage with efficient pipe-delimited format
- Improved time formatting with leading zeros for consistency
- Enhanced documentation with technical implementation details
- Streamlined alarm management processes
- Optimized memory usage and performance

### Fixed
- Fixed issue with My Alarms not properly listing scheduled alarms
- Addressed crontab corruption risk with more robust file handling
- Improved error handling throughout the extension
- Fixed edge cases in alarm creation and deletion

## [1.0.0] - {PR_MERGE_DATE}
### Added
- Initial release
- Create system-wide alarms that work even when Raycast is closed
- Manage alarms with easy-to-use interface
- Sound notifications with custom popup dialogs