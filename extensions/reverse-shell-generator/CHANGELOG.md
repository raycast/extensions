# Reverse Shell Generator Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Added support for 40+ reverse shell types across multiple categories
- Added smart categorization system (Shell Tools, Scripting Languages, Compiled Languages, Windows, MSFVenom Payloads)
- Added OS filtering functionality for Linux, Windows, and macOS
- Added multiple copy options: raw command, URL encoding, Base64 encoding, and listener command
- Added configuration persistence using LocalStorage to auto-save IP address and port
- Added detailed command preview interface with markdown rendering
- Added export commands to file functionality
- Added keyboard shortcuts for all major actions
- Added multiple sorting options (by category, name, or OS)
- Added command details display including description, supported OS, listener setup, and security warnings
- Added complete documentation (README.md with screenshots)
- Added extension icon (512x512 PNG)
- Implemented TypeScript with full type safety
- Implemented form validation for IP addresses and port numbers
- Implemented code quality enforcement with ESLint and Prettier

## [Unreleased] - 2026-03-10

### Added
- add listener alternatives for nc templates
- add 5 more reverse shell templates
- add 27 new reverse shell templates
- add bind shell templates and more reverse shells
- update extension icon with terminal/reverse-shell theme

### Changed
- trigger CI re-run
- add GitHub Actions workflow for automatic changelog generation
- Add Vitest test framework and unit tests
- Initial commit: Reverse Shell Generator extension

### Fixed
- wrap C# template with PowerShell compile-and-run command
- add prettier config, metadata folder, remove windows from nodejs
- use correct file extensions when saving, fix title case
- address PR review issues
- resolve minimatch ReDoS vulnerability

### Documentation
- update CHANGELOG.md [skip ci]
- update CHANGELOG.md [skip ci]
