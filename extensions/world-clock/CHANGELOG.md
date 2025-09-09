# World Clock Changelog

## [Bugfix & Maintenance] - 2025-07-16

- Avoid accessing the `.map` function on possibly undefined data
- Bump all dependencies to the latest

## [Optimization Extension] - 2025-04-29

- Supports non-integer time zone offset

## [Refactor Extension] - 2025-01-20

- Refactoring extensions to replace the api used, now using [TimeAPI](https://www.timeapi.io)

## [Fix Star Half Hour Time Zone] - 2024-10-04

- Fix the bug that the half-hour time zone is not included in starred time zones

## [Fix Half Hour Time Zone] - 2024-09-24

- Fix the bug that the half-hour time zone is not included in current time

## [Update Refresh interval] - 2024-07-30

- Update the refresh interval to 10 seconds

## [Update Extension Icon] - 2024-07-30

- Support set avatar for starred time zones
- Support duplicate starred time zones
- Show the first starred time zones in the menu bar
- Update the extension and command icons

## [Update Memo Icon] - 2023-10-16

- Now the Grid view will show the memo icon

## [Sort Time Zones] - 2023-05-30

- Starred time zones support sorting

## [Update Date Format] - 2023-01-02

- Add more date formats

## [Update Raycast API] - 2022-12-02

- Update Raycast API version to 1.44.0

## [Add Menu Bar command] - 2022-09-05

- Add Menu Bar command: Query World Time

## [Add Grid layout] - 2022-06-22

- Add Grid layout for Query World Time command
- Add more time info, like how many hours ago, day or night

## [Fix 24hour bug] - 2022-06-18

- Fix 24hour bug
- Add new action for Query World Time: Toggle Details

## [Add feature: adding aliases to time zones] - 2022-06-10

- Add feature: you can set aliases for starred time zones now
- Add new preference: Hour 24
- Optimize list loading speed

## [Initial Version] - 2022-05-26

- Query the current time of a region, ip or domain.
