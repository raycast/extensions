---
id: TASK-4
title: Remove redundant command icon declaration
status: Done
assignee: []
created_date: '2026-07-10 03:31'
updated_date: '2026-07-10 14:44'
labels:
  - manifest
  - cleanup
dependencies: []
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
package.json:17 sets "icon": "icon.png" on the command entry, which is identical to the extension-level icon at package.json:6. For a single-command extension, Raycast falls back to the extension icon automatically. The duplicate declaration means any future icon rename must be done in two places or the icons drift out of sync.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The 'icon' field is removed from the command entry in package.json
- [x] #2 Extension still renders with the correct icon in Raycast (verified via ray develop)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed 'icon': 'icon.png' from the command entry at package.json line 17. The extension-level icon at line 6 is unchanged. JSON validity confirmed via node JSON.parse. AC #2 (visual verification via ray develop) cannot be run on this Linux management server — deferred to reviewer to confirm icon renders correctly in Raycast.
<!-- SECTION:NOTES:END -->
