---
id: TASK-7
title: Clarify UTC-offset dropdown covers whole hours only
status: Done
assignee: []
created_date: '2026-07-10 03:32'
updated_date: '2026-07-10 20:13'
labels:
  - copy
  - manifest
dependencies: []
priority: low
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
package.json:1723-1832 lists UTC-12 through UTC+14 in whole-hour steps. src/timezone.ts:10-13 parses with /^UTC([+-]\d{1,2})$/, which also only supports whole hours. This leaves India (+5:30), Nepal (+5:45), Newfoundland (-3:30), etc. uncovered by the UTC mode — but the IANA dropdown does cover them. This is a defensible scope decision; it just needs to be documented so users don't get confused.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 package.json:1720 UTC Offset preference description states whole-hour offsets only and points users to IANA mode for :30/:45 zones
- [x] #2 No code changes to parseUtcOffsetHours required (scope stays whole hours)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated UTC Offset description to state whole-hour offsets only and point to IANA mode for :30/:45 zones. No code changes to parseUtcOffsetHours.
<!-- SECTION:NOTES:END -->
