# Send To Memos Changelog

## [Fix] - 2026-04-20

- fix: restore memo listing for newer Memos instances by resolving the current user via `/api/v1/auth/me` and listing memos with the authenticated user's `parent` resource name.
- fix: remove the render loop in `MemosListCommand` by deriving filtered items from fetched data instead of storing a second derived list in component state.

## [Update] - 2025-12-07

- update dependencies and improve type safety.
- fix: correct indentation in `filterList` mapping.
- fix: handle user data safely in `MemosListCommand`.

## [Update & Breaking Change] - 2025-09-03

- support memos@0.25.0.

## [Update] - 2025-03-31

- support memos@0.24.0.

## [Update] - 2024-12-23

- support memos@0.23.0.

## [Update] - 2024-07-20

- support sendMemoForm.

## [Update] - 2024-05-21

- support memos@0.22.0.

## [Update] - 2024-03-05

- fix open in browser 403.

## [Update] - 2023-08-01

- 0.14.0 uses a new api and the extension needs to be compatible.

## [Initial Version] - 2023-02-09
