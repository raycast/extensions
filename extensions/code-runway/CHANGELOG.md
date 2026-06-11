# Code Runway Changelog

## [1.2.0] - 2026-03-27

### Added

- cmux terminal support with CLI-based launcher (split panes, tabs, workspaces)
- OpenAI Codex desktop app as an editor option
- Auto-detect newly installed editors and add recommended templates on next launch

### Changed

- Editor auto-sync now runs on every load instead of only once, so new editors are picked up without manual configuration

## [1.1.0] - 2025-03-19

### Added

- Multi-terminal support: Ghostty and iTerm alongside Warp
- Editor launch templates: Cursor, Windsurf, VS Code, and more
- Configurable Enter key action: launch default template or choose from template picker
- Custom SVG icons for split direction (Left/Right, Top/Bottom) and launch mode (Split Panes, Multi-Tab, Multi-Window)
- Terminal app icons shown in template list (Ghostty, Warp, iTerm native icons)
- Template event system for automatic UI refresh

### Changed

- Extension preference moved to extension level for easier access
- Improved template icon display using native app icons instead of generic icons

## [1.0.0] - 2025-09-30

### Added

- Initial release
- Smart project discovery with automatic scanning
- Warp terminal integration with split panes, tabs, and windows
- Launch templates with customizable commands
- Default template support for quick launch
- Project directory management with enable/disable controls
