# Plexus Changelog

## [Localhost Web Servers] - {PR_MERGE_DATE}

### Changed
- Detection is no longer limited to Node.js: Plexus now lists any localhost server that answers an HTTP request (Node, PHP/Laravel, Python, nginx/Herd, …), and hides non-web services like databases. Works for native and WSL-hosted servers.

### Note
- HTTPS-only dev servers are not detected yet.

## [Windows Support] - {PR_MERGE_DATE}

### Added
- Windows support: server discovery, process command/working-directory detection, and kill-process now work on Windows via PowerShell (`Get-NetTCPConnection`, `Win32_Process`) and `taskkill`.
- On Windows, also detects Node.js servers running inside WSL (via `wsl.exe` + `/proc`), shown with a WSL tag and reachable on `localhost`; project names read over `\\wsl.localhost`, and kill routes through `wsl kill`.

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
