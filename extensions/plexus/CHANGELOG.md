# Plexus Changelog

## [Windows Support] - {PR_MERGE_DATE}

### Added
- Windows support: server discovery, process command/working-directory detection, and kill-process now work on Windows via PowerShell (`Get-NetTCPConnection`, `Win32_Process`) and `taskkill`.

### Fixed
- Cross-platform path handling so project names resolve correctly on Windows.

## [1.1.0] - 2025-10-01

### Added
- **Kill Process**: Added an action to terminate running processes directly from the Raycast interface with a confirmation dialog.

## [1.0.0] - 2025-09-04

### Added
- **Initial release** of Plexus - Localhost Search extension
- Smart discovery of running Node.js development servers on localhost
- Project detection with automatic framework identification
- Quick access to development servers through Raycast interface
- Process management with detailed process information
- Working directory detection for better project context
- Clean, modern TypeScript codebase with async/await patterns
- Comprehensive utility functions for process and project detection
