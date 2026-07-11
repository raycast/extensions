# Cron Description Changelog

## [Add Default Timezone Configuration] - 2026-03-23

- Added a user preference to set a default timezone for cron expressions instead of always using the local timezone
- Added validation to ensure the configured timezone is valid, with fallback to local timezone and a warning toast if invalid

## [Set Timezone + Modernize] - 2026-01-19

- Set a timezone to use for Cron calculation and see when the next run will be (ref: [Issue #24588](https://github.com/raycast/extensions/issues/24588))
- Modernize to use latest Raycast configuration

## [Initial Version] - 2022-10-20
