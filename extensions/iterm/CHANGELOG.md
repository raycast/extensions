# iTerm Changelog

## [New Features & Improvements] - 2026-04-14

- Added `Switch iTerm Session` command — unified session switcher listing all open panes grouped by tab, with a window filter dropdown (shown when multiple windows are open), persistent custom tags per session (Cmd+T to assign), and descriptive errors when the `iterm2` Python package is missing
- Added `Search Projects in iTerm` command to browse a configurable projects directory (`~/Projects` by default) and open folders in new tab, new window, horizontal split, or vertical split — with git branch and version tag badges
- Added `Switch iTerm Color Preset` command to apply a color preset to the current session's profile (requires iTerm2 Python API)
- Added `Move iTerm Session` command to detach the current pane to a new window or move it to an existing one
- Added horizontal and vertical split actions to `Open iTerm Profile`
- Added `it2api` availability warning on split commands when iTerm2 is not installed at the default path
- Fixed `it2api` subprocess PATH to include Homebrew and mise shims so commands work correctly from Raycast's environment
- Fixed `useMemo` dependency array in core hook
- Fixed TypeScript node type definitions
- Aligned all command titles to a consistent naming pattern
- Updated dependencies: `@raycast/api` 1.79 → 1.104, `typescript` 5 → 6, `eslint` 9 → 10, `@types/node` 22 → 25

## [New Feature] - 2026-01-07

- Added `Open iTerm Profile` command to open specific iTerm profiles in new window or tab

## [Extension improvement] - 2025-11-19

- Added configuration to open iTerm in a new window or a new tab for `Open iTerm Here` command

## [✨ AI Enhancements] - 2025-02-21

## [Extension improvement] - 2024-04-17

- Added open file path when nothing is selected in `Open iTerm here` command

## [Extension improvement] - 2023-10-03

- Added `Edit in iTerm` and `Open iTerm here` commands

## [Fix] - 2023-08-28

- Keep the same desktop focused when creating a new iTerm window

## [Extension improvement] - 2023-07-17

- Added split horizontally anv vertically commands

## [Initial Version] - 2023-01-24
