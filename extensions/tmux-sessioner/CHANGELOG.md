# Tmux Sessioner Changelog

## [Add support for renaming tmux windows] - 2025-01-19

- Created a new Component to handle both renaming windows and sessions
- Added a new command to rename windows, with shortcut `⌥⌘R`
- Updated all shortcuts to use the `⌥⌘` modifier, to align with how other extensions are using shortcuts

## [v0.0.9] - 2025-01-10

### Fixed

- Create session in iCloud Directory

## [v0.0.8] - 2025-01-08

### Added

- Configure default directory to start new session in
- Optional: select directory when creating new session

## [v0.0.7] - 2025-01-02

### Updated

- Changed Keyboard shortcuts for **Delete This Window**, **Delete This Session** to Raycast standardised ⌃X (from ⌘D)

## [v0.0.6] - 2025-01-02

### Added

- Support Ghostty Terminal 👻

## [v0.0.5] - 2024-04-14

### Updated

- In manage tmux windows, support filter by both window name and session name.
- Better UI in manage tmux windows. Use accessories to show session name on the right side of list item.
- Audit fix some package vulnerabilities.

## [v0.0.4] - 2024-01-19

### Fixed

- `Change Default Terminal` will be launched automatically when there isn't one selected.

## [v0.0.3] - 2023-09-05

### Fixed

- Change the filtering of the terminal app to use bundle ID, in order to support systems in other languages.

## [v0.0.2] - 2021-06-20

### Added

- Support WezTerm Terminal 🖥️

## [v0.0.1] - 2021-05-12

### Added

- Allow Switching between windows 🔄

### Fixed

- Fix code structure to be more readable 📝
- Refactor utils folder

## [Initial Version] - 2023-04-26
