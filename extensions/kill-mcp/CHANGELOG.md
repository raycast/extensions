# Kill MCP Changelog

## [1.0.0] - 2026-03-24

### Added
- Auto-refresh: Process list now updates automatically every 5 seconds
- Configurable thresholds: RAM and CPU thresholds are now exported as constants
- Better error handling: User-friendly toast notifications when loading fails

### Changed
- Improved time parsing: Now uses `etime` instead of `lstart` for more robust parsing across different locales
- Better security: PID validation and use of `spawnSync` instead of `execSync` for killing processes
- Code refactoring: Extracted color functions (`getSourceColor`, `getRAMColor`, `getCPUColor`) to utils for reusability

### Fixed
- Removed unused `getSourceIcon` function
- Fixed potential command injection vulnerabilities in process killing
- Fixed false positive matching in MCP server detection
- Removed dead code and code duplication in mcp-detector.ts
- Improved ESLint and Prettier configuration compatibility

## [Initial Version] - 2025-01-19

- List all running MCP servers from Claude Desktop, VS Code, Cursor, and Claude Code
- View detailed information about each MCP server (RAM, CPU, start time)
- Kill individual MCP servers gracefully or force kill
- Kill all MCP servers at once
- Filter servers by source application
- Copy PID and full command to clipboard
