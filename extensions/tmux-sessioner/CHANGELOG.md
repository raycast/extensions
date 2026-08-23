# Tmux Sessioner Changelog

## [Search Session Output] - 2026-08-22

### Added

- **Search Session Output** command: full-text search across the scrollback of every pane in every tmux session — commands you ran and the output they printed. Results are grouped by session (one entry per distinct line, newest first) with the surrounding lines shown in the detail pane; `⏎` switches to the matching session and window, `⌘T` / `⇧⌘T` open it in a new terminal tab/window, `⇧⌘C` copies the line, `⌘R` reloads the scrollback.

## [Open sessions in a new terminal tab or window] - 2026-08-04

### Added

- **Open in New Tab** (`⌘T`) and **Open in New Window** (`⇧⌘T`) actions that attach the selected session in a brand-new tab/window of your default terminal — no need for an already-attached tmux client. Supported per terminal: iTerm2 and Ghostty ≥ 1.3 (tab + window via AppleScript), WezTerm (tab + window via `wezterm cli`), kitty (tab with remote control enabled, window always), Terminal.app and Alacritty (window only). Unsupported combinations show a hint to use Switch instead.
- **Create and Open in New Tab/Window** secondary action in Create New Session.
- **Project bootstrap in Create New Session**: an optional *Create New Folder* mode that creates `<default directory>/<name>` for the session (with a *Create New Folder by Default* preference), an optional *Startup Command* typed into the fresh session (prefilled from the new *New Session Startup Command* preference), and a session-name argument so `Create New Session myproject` from root search prefills the form. An *Open in Terminal After Create* preference makes opening the new session in a tab/window the default submit action.
- Session list now shows window count, an attached indicator, and last activity time.
- **Kill Multiple Sessions** (`⇧⌘X`): a checklist view where `⏎` toggles a session, `⇧⏎` selects the whole range since the last toggle, with Select All / Select All Numeric / Deselect All actions, and `⌘⏎` kills the selection. Plus **Kill All Numeric Sessions** (`⌥⇧⌘X`) to clean up throwaway sessions like `34`, `35`, ... in one go. Both ask for confirmation, as does Delete This Session now.

### Fixed

- Session names, directories, and window names are now shell-quoted, so names with spaces or special characters work correctly, and tmux targets use exact matching (`=name`) to avoid prefix-match accidents.

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
