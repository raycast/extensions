# Claude MCP Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Create, edit, and delete MCP server profiles with custom configurations
- Switch between profiles with automatic Claude Desktop restart
- Search and filter profiles by name or description
- Sort profiles by name, creation date, last used, or server count
- Profile details view showing comprehensive configuration information
- Profile validation with helpful error messages and warnings
- Direct profile deletion from the list view
- Automatic list refresh after profile operations
- Support for custom Claude Desktop configuration file paths
- Keyboard shortcuts for common actions

### Fixed
- Improved reliability of Claude Desktop process termination on macOS
- Corrected default Claude Desktop configuration path for macOS users
- Resolved keyboard shortcut conflicts with system shortcuts
- Fixed form rendering and validation issues in profile creation
- Enhanced profile editing experience with proper form population
- Improved error handling and user feedback throughout the extension

### Changed
- Streamlined profile deletion user experience with better confirmation dialogs
- Enhanced overall code architecture following SOLID principles
- Improved performance and maintainability of core components
