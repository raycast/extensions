# Extension Changelog

## [Batch Parsing and Recurring Events] - 2026-10-05

### Added

- Create up to three Calendar events or Reminder items from one Korean sentence
- Daily, weekly, and monthly recurring Apple Calendar events
- Recurrence limits by occurrence count or inclusive end date
- Explicit location markers using `장소:`, `장소=`, and `장소는`
- Optional command argument and fallback text to prefill the review form
- Build-time native Swift bridge for EventKit access without a user-installed Swift toolchain
- Regression tests for parser, batch, recurrence, permission, and bridge behavior

### Improved

- Request Calendar or Reminders permission only when the corresponding target is selected
- Preserve full dates when later batch clauses inherit the first clause date
- Keep only failed or unconfirmed clauses in the input after partial EventKit results
- Validate recurrence settings for the full batch before creating any item
- Require confirmation before retrying a creation whose native helper timed out
- Show parse, destination, and recurrence errors with native Form validation
- Show parsed locations for each item in the batch preview
- Update to Raycast API 2.6.1
- Use US English for all user-facing interface and error copy

### Fixed

- Prevent partially parsed batches from creating incomplete results
- Prevent commas in titles or locations from creating unintended items
- Prevent mixed Calendar and Reminder batches from using the wrong target
- Preserve explicit short durations in recurring events
- Include the selected recurrence end date at the event's scheduled time
- Stop creation when a previously selected Calendar or Reminder list no longer exists
- Infer the nearest AM/PM value for an unmarked time-range end
- Preserve recurrence wall-clock times across daylight-saving transitions
- Preserve token-like phrases inside titles and locations
- Split later batch clauses that start with spaced, standalone-day, next-year, or explicit-year date cues
- Avoid a submission crash when recurrence-only form values are omitted for non-recurring items
- Keep resolved dates stable when retrying failed batch items
- Require duplicate-risk confirmation even after editing other failed items
- Preserve EventKit error domain and code when a save fails
- Keep unresolved creation warnings tied to affected items across command launches
- Keep unchanged recurring retry clauses anchored when another clause is edited
- Prevent overlapping form submissions from creating duplicate items
- Parse locations between date and time expressions such as `내일 회의실에서 오후 3시 회의`

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
