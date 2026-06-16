# Fuzzy File Search Changelog

## [Directory and File Search Directives] - {PR_MERGE_DATE}

- Add `-d` / `-f` query directives to search directories or files only
- Parse directives before filtering so they are not passed to `fzf` as search terms

## [Rework] - 2025-10-05

- Use fzf CLI tool for fuzzy finding.
- Add automatic installation of the fzf CLI tool.
- Improve search performance.
- Add caching of indexed files
- Improve UI/UX with toast notifications.
- Fix issue where the heap memory limit is reached.

## [Initial version] - 2025-09-15
