---
id: TASK-10
title: Tighten preference descriptions to not depend on visual ordering
status: Done
assignee: []
created_date: '2026-07-10 03:32'
updated_date: '2026-07-10 20:13'
labels:
  - copy
  - manifest
  - polish
dependencies: []
priority: low
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
package.json:24 ('Timezone Format') description says 'This determines which of the two preferences below is used' — relying on 'above/below' language that would read wrong if the preference order ever changes. Child preferences at package.json:42 and package.json:1720 already do the right thing by referencing 'Timezone Format' by quoted name; only the parent description needs the same treatment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 package.json:24 description no longer uses 'below' or 'above' and instead references sibling preferences by their quoted title
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced 'the two preferences below' with explicit quoted names 'IANA Timezone' and 'UTC Offset' in the Timezone Format description.
<!-- SECTION:NOTES:END -->
