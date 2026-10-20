# Dock Badges Changelog

## [Native Dock Reading] - 2026-10-17

- The Dock is read through the Accessibility API by a small native helper instead of AppleScript, so each badge is matched to the exact app it belongs to and opens that app
- Ignored apps are told apart by bundle identifier, so a beta and a release with the same name can be ignored separately; apps ignored in the previous version stay ignored
- Updated to Raycast API 2.8

## [Initial Version] - 2026-10-16

- Menu bar item showing the summed notification badge count of every app in your Dock
- Dropdown lists the apps that currently have badges; click one to open it
- Circle, Bell or App symbol in Filled or Outline style; monochrome when idle, red when notifications are waiting
- Options to show the total count and to hide the item while no app has a badge
- Background refresh every 10 seconds
- Only application tiles are counted, so the Handoff tile's device identifier is never misread as a badge count
- Show a HUD message when an app can't be opened from the dropdown, instead of failing silently
- View Notifications command lists badged Dock apps in Raycast for keyboard access (thanks to @yianL's Read Me Maybe for the idea)
- Ignore apps to leave their badges out of the menu bar count
