# Random Data Generator Changelog

## [Fix Quicklinks and Locale Switching] - 2026-09-06

- Fixed quicklinks failing with a missing arguments error, by passing the quicklink data as launch context
- Fixed the locale dropdown reverting to English instead of keeping the selection
- Regenerated the listed values when the locale changes, so the command no longer needs relaunching

Quicklinks saved before this update need to be recreated.

## [Fix] - 2026-01-13

- Added shortcuts to the Windows version

## [Windows & Dependency Updates] - 2025-10-23

- Updated to the latest version of Faker (v10)
  - Command needs to be relaunched after local change
- Released extension for Windows

## [Fix] - 2024-02-24

- Fixed boolean "false" value not being displayed

## [Refactoring & Preferences] - 2024-02-04

- Refactored code to make it more maintainable
- Added the ability to set preference: `Default Action` to `Copy` or `Save` (issue #9609)
- Bump dependencies (left @fakerjs/faker at the old version, locales have breaking changes in v8)

## [Quicklinks & CUID] - 2023-10-23

- Added CUIDs as a possible data type to generate
- Add the ability to create quicklinks for copy-pasting specific random data

## [Fix] - 2023-05-07

- Removed science random data generator
