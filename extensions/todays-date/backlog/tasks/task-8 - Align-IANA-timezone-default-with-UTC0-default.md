---
id: TASK-8
title: Align IANA timezone default with UTC+0 default
status: Done
assignee: []
created_date: '2026-07-10 03:32'
updated_date: '2026-07-10 20:13'
labels:
  - manifest
  - defaults
dependencies: []
priority: low
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
package.json:44 defaults ianaTimezone to 'Europe/London' while package.json:1722 defaults utcOffset to 'UTC+0'. London is not UTC year-round — BST puts it at UTC+1 in summer. Because timezoneType defaults to 'iana', first-run behavior differs from the UTC-mode default by half the year. Preferred fix: default IANA to 'Etc/UTC' so both modes match at first run. This requires adding Etc/UTC to the IANA dropdown data — it is not currently present.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 'Etc/UTC' is added as an entry in the ianaTimezone dropdown data in package.json
- [x] #2 package.json:44 default is changed to 'Etc/UTC'
- [x] #3 Behavior at first run in IANA mode matches behavior in UTC mode with the default UTC+0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added Etc/UTC entry to ianaTimezone dropdown (between Australia/Sydney and Europe/Amsterdam). Changed default from Europe/London to Etc/UTC so both timezone modes agree at first run.
<!-- SECTION:NOTES:END -->
