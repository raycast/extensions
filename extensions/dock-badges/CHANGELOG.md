# Dock Badges Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Menu bar item showing the summed notification badge count of every app in your Dock
- Dropdown lists the apps that currently have badges; click one to open it
- Circle, Bell or App symbol in Filled or Outline style; monochrome when idle, red when notifications are waiting
- Options to show the total count and to hide the item while no app has a badge
- Background refresh every 10 seconds
- Only application tiles are counted, so the Handoff tile's device identifier is never misread as a badge count
- Show a HUD message when an app can't be opened from the dropdown, instead of failing silently
