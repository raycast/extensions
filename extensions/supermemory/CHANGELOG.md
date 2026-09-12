# Supermemory Changelog

## [Delete Memories + Filter by Project] - 2026-01-04

- Delete memories via new `Action`
- Filter memories by project (containerTag)
- Update `shortcut`s to be cross-platform

## [Search Projects + Enhancements] - 2025-10-13

- Added command to search and add projects
- Removed `useEffect`
- Simplified `getApiKey` since `Preferences` will be enforced for presence and trim automatically
- Moved API Key check into its own HoC

## [Initial Version] - 2025-10-02

- Added Supermemory integration with Add Memory and Search Memories commands
- Added project organization support for memories
