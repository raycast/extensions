# Claude Code Launcher

## [Claude Sessions] - 2026-08-10

### Added
- New "Claude Sessions" command to manage Claude Code sessions and background agents: live status list (busy/idle/done), attach or resume background agents in your terminal, stop sessions, delete completed ones, fork interactive sessions, and dispatch new background agents (`claude --bg`) with a prompt
- Optional "Claude CLI Path" preference on the new command for setups where the `claude` binary is not auto-detected

## [1.0.4] - 2026-03-24

### Added
- Support for iTerm2 terminal

## [1.0.3] - 2026-03-08

### Fixed
- Reverted Ghostty `-i` flag which caused unintended session restore and duplicate tabs

### Added
- New "Ghostty: Open Behavior" preference to open Claude Code in a new tab within the existing Ghostty window (requires macOS Accessibility permissions)

## [1.0.2] - 2026-03-04

### Fixed
- Ghostty adapter now uses interactive shell (`-i` flag) so PATH entries from `~/.zshrc` (like `~/.local/bin`) are available

## [1.0.1] - 2026-01-07

### Added
- Support for Warp terminal

## [Unreleased]

### Added
- Support for Ghostty terminal emulator

## [1.0.0] - 2025-09-30

### Features
- Save and manage favorite project directories
- Quick fuzzy search across all projects
- Smart sorting by recency and usage frequency
- Custom names and icons for projects
- Support for Terminal.app and Alacritty
- Keyboard shortcuts for all common actions
- Path validation and error handling