# Extension Changelog

## [Initial Version] - 2026-03-16

### Added

- Apple Reminders support with selectable reminder list destination.
- Regression fixture tests for parsing edge cases.
- Detailed usage and parsing guide under `docs/usage-and-parsing-guide.md`.

### Changed

- Migrated bridge logic to Swift + EventKit (Calendar and Reminders).
- Added automatic target recommendation (`deadline -> reminder`, `event -> calendar`) with manual override protection.
- Expanded Korean deadline parsing coverage:
  - `까지/까지는/전/전에/전까지/이전/이전까지`
  - `N일 안에/이내/내`
  - `N시간 안에/이내/내`
  - `오늘/내일/모레 중`
  - `이번주/다음주/다다음주 내`
  - `이번달/다음달 내`
- Updated command metadata and user-facing text to US English.

### Fixed

- Month-end overflow when resolving next-month day expressions.
- Sunday week-offset edge case for `이번주 ...`.
- AM/PM 12 o'clock normalization and mixed 24-hour validation.
- Greedy location capture when multiple `에서` tokens are present.
