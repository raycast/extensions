# Authy Extension Changelog

## [Refactoring] - 2024-07-09

- Code refactoring
- Assets cleanup 
- Speed extension loading
- Add Export Tokens action

## [API Update, Accuracy and UI] - 2024-06-24

- Update decoding in line with updated API response
- Use tag for OTP so it gets priority over subtitle
- Update interval to be more accurate
- Use built in progress icon

## [UI] - 2024-04-15

- Move the timer icon to right side. So the icon can be always aligned for a better visual

## [Updated extension title] - 2024-04-03

## [Updated extension name] - 2023-10-16

## [Updated Contributors] - 2023-06-14

## [Bug fix] - 2023-03-30

- Update deps
- [#4485](https://github.com/raycast/extensions/issues/4485) Don't fail all OTPs in case extension couldn't decrypt some OTPs

## [Sort OTP by usage] - 2022-04-04

- Add metadata for store
- [#1171](https://github.com/raycast/extensions/issues/1171) Sort list by recent usage

## [More icons and preference to hide services] - 2022-02-10

- [#845](https://github.com/raycast/extensions/issues/845) Add excludeNames preference to optionally exclude accounts by name
- Merge services and app to single list
- Add support for looking up icons by the preferred name property as an additional fallback
- Hide item subtitle if it is the same as the name
- Refactor logos in constants for easier aliases
- Add more icons

## [Bug fix and critical dependency update] - 2022-01-11

- [#645](https://github.com/raycast/extensions/issues/645) Update node-forge version
- [#646](https://github.com/raycast/extensions/issues/646) Add subtitle as keyword for search

## [Icons and timer] - 2022-01-06

- Add icons
- Add past action
- Add visual timer for OTPs
- Add alternative names for services

## [Bug fix] - 2021-12-06

- [#485](https://github.com/raycast/extensions/issues/485) Authy OTPs are too short

## [Authy integration] - 2021-12-03

- Search OTP code
- Sync accounts with Authy
- Copy OTP to clipboard
