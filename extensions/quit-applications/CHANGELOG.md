# Quit Applications Changelog

## [Bug fix] - 2025-10-09

- Fixed Apple Events authorization error (-1743) by adding fallback to `ps` command when System Events permission is not granted

## [Bug fix] - 2025-05-27

- Fixed issue where excluded applications still appeared in the list when multiple windows were open

## [Update] - 2025-04-25

- Added `Quit All Applications` to quit all applications at once

## [Update] - 2024-09-03

- Transitions component to from a class component to a function component
- Fixes issue where quitting an app takes you back to the first element in list

## [Enhancement] - 2024-04-11

- Added clearSearchBar after quitting an app.

## [Enhancement] - 2024-04-05

- Fixed a bug where some of the apps (e.g. Steam) were not quitting

## [Performance Improvements] - 2024-01-19

- Improve icon fetching performance by using the API provided by Raycast

## [Deeplinks Support] - 2023-10-21

- Added Deeplink Support
- Added Actions for Creating Quicklinks Directly

## [Bug fix - Quit-Applications crashing] - 2023-04-26

- Fix the case where some of the apps (e.g. MasOS Stocks app) were causing the quit applications to crash

## [Add icons] - 2023-02-26

- Add icons to each application you are about to quit
- Add "Quit" in front of every app name

## [Restart application] - 2023-01-24

- Add the option to restart the application

## [Update] - 2023-01-17

- Use a toast instead of an HUD so that the Raycast remains open.

## [Enhancement] - 2022-12-14

Fixed a glitch when quitting an aplication.

## [Initial Quit Applications implementation] - 2022-10-27
