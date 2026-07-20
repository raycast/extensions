# Tmux Cheatsheet Changelog

## [Updated shortcuts and dependencies] - 2026-05-08

- Update/add shortcuts for copying commands from the list and detail views
- Update Raycast, React, TypeScript, Prettier, and linting-related dependencies
- Use the Raycast ESLint config package in `.eslintrc.json`

## [Detect prefix and bindings via tmux CLI] - 2026-04-17

- Detect the prefix and keybindings by shelling out to `tmux show-options` and `tmux list-keys` instead of parsing config files
- Support non-standard config layouts (XDG, `source-file` includes, etc.) that the previous file parser missed

## [Fixed author mismatch] - 2026-04-04

- Fixed author mismatch in extension package configuration

## [Added Keybinding Detection, Category Filter, and Key Symbols] - 2026-04-01

- Auto-detect custom keybindings from `~/.tmux.conf` and show them instead of defaults
- Category filter dropdown to narrow commands by section
- Grouped list view with sections when not searching
- Pretty key symbols: `C-a` displays as `⌃A`, arrow keys as `↑↓←→`
- Fuzzy search now includes shortcut keys
- Paste to Terminal action alongside Copy Command
- Auto-detect tmux prefix from config files

## [Initial Version] - 2025-02-25
