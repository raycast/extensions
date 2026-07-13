---
id: TASK-2
title: Add Raycast Store submission assets
status: Done
assignee:
  - '@me'
created_date: '2026-07-10 03:31'
updated_date: '2026-07-10 14:40'
labels:
  - docs
  - ship-blocker
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Store submission via 'ray publish' requires a metadata/ folder with screenshots and a CHANGELOG.md with the {PR_MERGE_DATE} placeholder. package.json declares MIT license but there is no LICENSE file in the repo. Without these, the extension cannot be submitted to the Raycast Store.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 metadata/ directory exists with at least one PNG screenshot showing the root-search subtitle
- [x] #2 metadata/ contains at least one screenshot of the preferences pane
- [x] #3 CHANGELOG.md exists at repo root with an 'Initial Version' entry using the {PR_MERGE_DATE} placeholder
- [x] #4 LICENSE file exists at repo root matching the MIT license declared in package.json
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Added CHANGELOG.md (with {PR_MERGE_DATE} placeholder and Initial Version entry), LICENSE (MIT, 2026, AJ Markow), and created the metadata/ directory. AC #1 and #2 (screenshots) require manual capture on a Mac with Raycast running — cannot be generated from the server.

## Changes
- CHANGELOG.md: follows Raycast store template format with {PR_MERGE_DATE} placeholder, lists key features of v1.0.0
- LICENSE: MIT, matches package.json declaration
- metadata/: directory created; PNG screenshots still need to be added manually

## Follow-up (manual)
To complete AC #1 and #2, on a Mac with Raycast and the extension installed via `ray develop`:
1. Screenshot showing root-search with the date subtitle → save as `metadata/1.png`
2. Screenshot showing the extension preferences pane → save as `metadata/2.png`

Raycast store recommends 1280x800 or 2560x1600 PNG, named numerically (1.png, 2.png, ...).

## Update — screenshots landed
- Downloaded 1.png and 2.png from provided S3 URLs
- Resized with ImageMagick (via nix-shell -p imagemagick) to exactly 2000x1250 PNG, padded with black to preserve aspect ratio
- 1.png: root-search with "Today's Date" pinned at top, subtitle "Friday, July 10, 2026 · Press enter to copy" visible
- 2.png: Raycast Settings > Extensions > Today's Date, showing all four preferences with their current values
- Raw source PNGs discarded; only the final 2000x1250 versions committed

## Note
Screenshot 2.png captures the current command description text ("Shows the current date in root search..."). TASK-3 changes that copy — 2.png will need to be recaptured after TASK-3 lands to stay accurate.
<!-- SECTION:NOTES:END -->
