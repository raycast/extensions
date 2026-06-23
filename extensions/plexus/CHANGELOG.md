# Plexus Changelog

## [Fix favicon and title caching] - 2026-06-23

### Fixed

- Each service now shows its own favicon and page title instead of briefly displaying the icon/title of a previously viewed service (disabled `keepPreviousData` in the favicon and page-title fetch hooks)

## [1.2.0] - 2026-06-01

### Added

- Windows support: server discovery, process info, and kill-process now work on Windows (`netstat` for the port list, a lazy `Win32_Process` query for command lines, `taskkill` for killing).
- Detects servers running inside WSL (enumerated via `wsl.exe` + `/proc`), shown with a `WSL: <distro>` tag and reachable on `localhost`; project names are read over `\\wsl.localhost`, and kill routes through `wsl kill`.
- Detection is no longer limited to Node.js: Plexus lists any localhost server that answers an HTTP request with an HTML page (Node, PHP/Laravel, Python, etc.) and hides non-web services such as databases.

### Changed

- Faster discovery and instant reopen: per-process lookups are deferred to the few ports that pass the HTTP probe, and results are cached.
- Cross-platform path handling so project names resolve correctly on Windows and WSL.

### Note

- HTTPS-only dev servers are not detected yet.

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
