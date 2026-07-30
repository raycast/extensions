# Quick Shell Changelog

## [Command suggestions] - {PR_MERGE_DATE}

- Package Windows `QuickShell.Suggest.exe` into Raycast assets for richer command suggestions
- Manual Add Workspace shows suggestions in the dropdown without auto-applying them
- Keep leftover suggestions selectable; fall back to local folder heuristics on macOS or when Suggest is unavailable
- Improve discovered-repo workspace seeding and suggestion reliability

## [macOS Tier A] - 2026-07-22

- Add macOS to Raycast platforms: Terminal.app / iTerm2 launch, Mac companions, discover roots, import/export dialogs
- Multi-launch tabs on Mac (Terminal.app / iTerm2) when the preference is enabled; Windows Terminal tab grouping unchanged on Windows
- Open Directory allows POSIX paths; hide Run as administrator on Mac
- Richer Mac discover roots (`~/Code`, `~/Library/Developer`, Desktop/Documents Projects, …)
- Dual-platform keyboard shortcuts; CI macOS lint/test/build alongside Windows
- Distribution is Raycast Store only (no GitHub Release / WinGet sideload packages)

## [Preferences, useForm, and navigation] - 2026-07-06

- Move default terminal, profile, and recents to Raycast extension preferences
- Refactor workspace form with `useForm` / `FormValidation`, drafts, and `launchCommand` after create
- Convert settings command to Manage Workspaces (import/export/undo + open preferences)
- Add ESLint/Prettier scaffold, launch context seeding, and fallback command support

## [Lifecycle, manifest, and platform guards] - 2026-07-06

- Add Windows-only guard views and load-error toasts across commands
- Type commands with `LaunchProps`; support `fallbackText` and create `directory` argument
- Add extension-level Store keywords; rename changelog for Version History
- Document deeplinks and manifest conventions in README

## [Parity, performance, and Raycast UX] - 2026-07-06

- Add discover git repos, import/export, undo/redo, companion app, dev server links, and run-as-standard
- Memoize workspace health for list rendering and debounce recent-write persistence
- Use Raycast `showFailureToast`, `withCache`, `updateCommandMetadata`, and `Action.SubmitForm`
- Add command subtitles and root-search keywords for Store discoverability

## [Workspace form UX and home keyword search] - 2026-07-06

- Directory-first workspace form with auto-fill from project layout
- Machine-discovered Windows Terminal profiles and multi-command launches
- Home keyword search priority in Open Workspace

## [Initial Raycast extension] - 2026-07-06

- Open, create, edit workspace commands with Windows terminal launch support
- Favorites, recents, task search, and QuickShell settings
