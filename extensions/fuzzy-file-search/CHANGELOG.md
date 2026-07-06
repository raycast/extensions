# Fuzzy File Search Changelog

## [Show in Finder Shortcut] - 2026-07-06

- Add Cmd+Enter shortcut to reveal the selected file in Finder by placing Show in Finder as the secondary action

## [Directory and File Search Directives] - 2026-06-17

- Add `-d` / `-f` query directives to search directories or files only
- Parse directives before filtering so they are not passed to `fzf` as search terms
- Debounce fzf filtering and cap results to avoid exceeding Raycast's extension memory limit

## [Open With Action] - 2026-03-12

- Add "Open With" action to open files with a specific application (Cmd+O).

## [Rework] - 2025-10-05

- Use fzf CLI tool for fuzzy finding.
- Add automatic installation of the fzf CLI tool.
- Improve search performance.
- Add caching of indexed files
- Improve UI/UX with toast notifications.
- Fix issue where the heap memory limit is reached.

## [Initial version] - 2025-09-15
