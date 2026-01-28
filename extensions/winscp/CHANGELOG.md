# WinSCP Changelog

## [Fixed Session Parsing] - 2025-11-14

- Fixed parsing of WinSCP.ini to correctly extract session names
- Added support for workspace sessions (e.g., "Media/0000", "My Workspace/0000")
- Added support for regular sessions (e.g., "user@host")
- Sessions with URL-encoded names (e.g., "My%20Workspace") are now properly decoded
- Improved regex patterns to handle different session name formats
