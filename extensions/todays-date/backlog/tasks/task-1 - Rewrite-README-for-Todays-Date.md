---
id: TASK-1
title: Rewrite README for Today's Date
status: Done
assignee:
  - '@me'
created_date: '2026-07-10 03:31'
updated_date: '2026-07-10 14:21'
labels:
  - docs
  - ship-blocker
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
README.md still has the old '# Current Date' title (extension was renamed to 'Today's Date') and the whole body is a single sentence. It needs to describe what the extension does, document the preferences, show strftime examples, and either drop or verify the stale raycast.com/templates/team-time link (extension slug is now todays-date).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 README H1 is 'Today's Date'
- [x] #2 README explains what the extension does and how root-search subtitle behaves
- [x] #3 README documents both timezone modes (IANA vs UTC offset) and how they interact with timezoneType
- [x] #4 README lists common strftime directives with example rendered output
- [x] #5 Stale raycast.com/templates/team-time link is removed or replaced with a verified URL
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Rewrote README.md to match the renamed extension and to cover the pieces users need to actually configure and use the command.

## Changes
- Retitled H1 from "Current Date" to "Today's Date"
- Added a one-paragraph description of the no-view command behavior (root-search subtitle + copy-on-enter) and refresh cadence
- Documented all four preferences in a table with type, default, and behavior — including the interaction between Timezone Format and the two mode-specific preferences
- Added strftime directive reference table matching what src/strftime.ts actually supports (kept in sync deliberately — will need updating alongside TASK-5)
- Added a small table of example format strings with sample output
- Removed the stale raycast.com/templates/team-time reference (extension slug is now todays-date and the template link was not verified); replaced with a linked Raycast developer-docs reference for no-view commands

## Testing
- Manual read-through against the manifest (package.json) and src/strftime.ts to confirm every documented preference key, default, and directive matches the code
- No code changes; docs-only

## Follow-up
- TASK-5 adds %F/%T/%R/%e/%z to strftime — the directives table here will need matching rows added when that lands
<!-- SECTION:NOTES:END -->
