# Qoder Changelog

## [1.0.2] - 2026-02-11

### Fixed
- Fix "Search Recent Projects" not showing all projects by reading from `state.vscdb` instead of `storage.json`
- Fix URL-encoded characters in project paths (e.g. spaces shown as `%20`)
- Use `execFile` instead of `execSync` for safer database access without shell interpolation
- Add support for workspace-type recent entries in addition to folder entries

## [1.0.1] - 2026-01-08

### Changed
- Refactor extension loading logic in "Show Installed Extensions" command

## [1.0.0] - 2026-01-07

- Initial release
- Add "Open New Window" command to open a new Qoder window
- Add "Search Recent Projects" command to search and open recent projects
- Add "Open in Qoder" command to open current Finder selection in Qoder
- Add "Install Extension" command to install Qoder extensions by ID
- Add "Show Installed Extensions" command to view all installed extensions
