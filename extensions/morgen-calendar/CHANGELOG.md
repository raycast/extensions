# Morgen Calendar Changelog

## [AI Tools and macOS Support] - {PR_MERGE_DATE}

- Add macOS support alongside Windows.
- Add List Today's Events, Search Events, and meeting/location actions.
- Add AI calendar lookup, event search, and confirmed timed-event creation.
- Preserve time zones and DST boundaries; validate new writes and recheck event ownership and stale edits.
- Improve read failure states, request lifecycle handling, mutation guards, and cache/transport robustness while retaining partial-account results.

## [Initial Release] - 2026-10-15

- Create timed and all-day events in connected calendars.
- Browse, inspect, edit, and delete upcoming events.
- Create native Morgen tasks with due dates, estimated time, and priority.
- Browse, inspect, edit, complete, and delete open native tasks.
