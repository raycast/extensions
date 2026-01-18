# Direct Launch into Jobs List

## Overview
The "Greenhouse" command should open the jobs list directly, skipping the intermediary root menu.

## Current Behavior
- User runs "Greenhouse" command
- Sees a root menu with "Jobs" entry
- Must select "Jobs" to see the jobs list

## Desired Behavior
- User runs "Greenhouse" command
- Sees the open jobs list immediately
- One less click to reach useful content

## Requirements
- `src/index.tsx` renders `JobsList` directly instead of a menu
- Remove the intermediate navigation step
- Preserve all existing JobsList functionality

## Acceptance Criteria
- Launching "Greenhouse" opens the open jobs list with no intermediary menu
- Search, actions, and navigation to pipeline still work as before
