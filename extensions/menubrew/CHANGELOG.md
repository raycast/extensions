# MenuBrew Changelog

## [1.1.0] - 2026-11-18

### Added
- **Package Size Cache**: caches resolved download sizes (`id@version`) in `LocalStorage` to make background refreshes significantly faster.
- **Rich Detail View**: displays package description and clickable homepage link directly in the `Check Outdated Packages` detail pane.
- **Mute / Unmute Packages**: hide noisy `--greedy` casks from the menu bar count and notifications (`⌘M`), with a dedicated `Muted` filter.
- **Sort by Size**: toggle sorting by largest download size (`⌘S`) to prioritize heavy updates.
- **Maintenance Actions**: run `brew cleanup` and `brew doctor` directly in iTerm/Terminal from the Action Panel.

## [1.0.0] - 2026-11-18

### Added
- Initial release with `Menu Bar Updates` (`10m` background refresh) and `Check Outdated Packages` commands.
