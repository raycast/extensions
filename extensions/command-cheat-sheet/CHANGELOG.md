# Command Cheat Sheet Changelog

## Semantic Versioning Guide

When releasing a new version, follow these guidelines:

- **Patch (1.0.X)** - Bug fixes and minor improvements
- **Minor (1.X.0)** - New features (e.g., new tool support, new search features)
- **Major (X.0.0)** - Breaking changes (e.g., restructuring manifest format)

Update both `package.json` version and add a new section to this changelog.

## [1.0.1] - {PR_MERGE_DATE}

### Fix

- Fixed icon path

## [Initial Release] - {PR_MERGE_DATE}

### Added

- Initial release of Command Cheat Sheet
- Fuzzy search across multiple tools and commands
- Multi-word search support (e.g., `nvim wrap`)
- Tool-based organization with separate JSON manifests
- OhMyZsh Git aliases (300+ commands)
- Initial Neovim keybindings (LazyVim)
- Copy to clipboard actions for shortcuts
- Development setup with hot reload
- Comprehensive README with setup and extension guide
