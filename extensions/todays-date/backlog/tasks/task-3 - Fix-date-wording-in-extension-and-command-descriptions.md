---
id: TASK-3
title: Fix 'date' wording in extension and command descriptions
status: Done
assignee: []
created_date: '2026-07-10 03:31'
updated_date: '2026-07-10 14:44'
labels:
  - copy
  - manifest
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
package.json:5 (extension description) and package.json:16 (command description) both say 'Shows the current date...' but the strftime formatter fully supports time directives (%H %M %S %I %p), and users will absolutely use them. Undersells the tool for a store visitor looking for a 'team time' clock. Also the command description restates the extension description then bolts on the clipboard behavior — the two should not near-duplicate each other.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Extension description at package.json:5 acknowledges both date and time
- [x] #2 Command description at package.json:16 does not restate the extension description verbatim; it focuses on the clipboard-copy behavior
- [x] #3 Command description length is reasonable for a Raycast tooltip (not multi-sentence)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated package.json line 5 (extension description) to say 'date and time' and reference strftime. Updated package.json line 16 (command description) to focus on clipboard-copy behavior in a single short phrase, removing the near-duplicate of the extension description.
<!-- SECTION:NOTES:END -->
