# Year in Progress Changelog

## [Improvement] - {PR_MERGE_DATE}

- Added Windows support for inline progress and managing custom date ranges.
- Added a dedicated Year in Progress command that can be added to Favorites to display the year's progress in Raycast.
- Displayed the selected progress in the normal X in Progress command's subtitle as well.
- Added a Command Progress dropdown to choose a calendar period or custom range for the command subtitles.
- Hid macOS-only menu-bar controls on Windows.
- Fixed concurrent updates overwriting saved progress and refreshes displaying the previous selection.
- Fixed deleting built-in periods and restored the year when a selected custom range is deselected or deleted.
- Fixed quarter percentages and refreshed progress values while the list stays open.
- Validated custom date ranges on submission and preserved recoverable saved data.
- Updated development tooling and resolved dependency audit findings.

## [Bugfix] - 2026-03-24

- Fixed user preferences (pinned items, menubar selections) resetting on extension restart

## [Bugfix] - 2025-01-02

- Fix typos in "Week starts date" settings dropdown
- Change type `any` to `Day` exported from date-fns

## [Improvement] - 2024-04-25

- Added feature (Show|Hide) in Command Subtitle

## [Improvement] - 2023-10-18

- Added Copy to Clipboard action in the listview

## [Bugfix] - 2023-10-02

- Fixed [bug](https://github.com/raycast/extensions/issues/8458) where menubar progress not updating its percentage

## [Improvements] - 2023-09-22

- Make progress icon dynamic

## [Added X In Progress] - 2023-03-29

- Add X In Progress command
- Add Show X In Progress In Menu Bar command

## [Initial Version] - 2023-01-25
