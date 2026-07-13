---
id: TASK-5
title: Add missing common strftime directives
status: Done
assignee: []
created_date: '2026-07-10 03:32'
updated_date: '2026-07-13 20:50'
labels:
  - feature
  - strftime
dependencies: []
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
src/strftime.ts:32-53 supports the core directives but is missing %F (=%Y-%m-%d), %T (=%H:%M:%S), %R (=%H:%M), %e (space-padded day), and %z (numeric offset). %F and %T in particular are the two most common shortcut directives on devhints.io/strftime — which is the exact reference we point users at from the preference description (package.json:1838). If a user types %F they currently get literal '%F' back in their clipboard. %z is cheap on both timezone paths (parseUtcOffsetHours for UTC mode, Intl.DateTimeFormat with timeZoneName: 'shortOffset' for IANA).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 %F renders as YYYY-MM-DD
- [x] #2 %T renders as HH:MM:SS (24-hour)
- [x] #3 %R renders as HH:MM (24-hour)
- [x] #4 %e renders day-of-month space-padded (e.g. ' 7' for the 7th)
- [x] #5 %z renders as +HHMM or -HHMM for both IANA and UTC-offset timezone modes
- [x] #6 Existing directives still pass all previous behavior
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Replaced the hand-rolled formatter (src/strftime.ts, deleted) with the samsonjs strftime npm package, which supports the full POSIX directive set including %F, %T, %R, %e, and %z.

## Changes
- Added strftime + @types/strftime dependencies
- src/timezone.ts now returns a UTC offset in minutes (getZoneOffsetMinutes); IANA zones still resolved via Intl so DST is correct
- src/index.ts formats via strftime.timezone(offset)(format, now)
- README/package.json/CHANGELOG updated to document full directive support

## Testing
- tsc --noEmit and npm run lint pass
- Runtime spot checks: %z renders -0500/+0530 for both offset modes; %F %T %R %e and all prior directives verified
<!-- SECTION:NOTES:END -->
