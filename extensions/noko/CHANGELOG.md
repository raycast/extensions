# Changelog

All notable changes to the Noko Raycast extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0](https://github.com/JuanVqz/noko-for-raycast/compare/v0.3.0...v0.4.0) (2025-10-16)


### Features

* add delete unapproved entry functionality ([#23](https://github.com/JuanVqz/noko-for-raycast/issues/23)) ([6986d7f](https://github.com/JuanVqz/noko-for-raycast/commit/6986d7f1e365690df8eef1b6b602202c542a60da))
* add summary section to EntriesView with time tracking and billable/unbillable split ([#15](https://github.com/JuanVqz/noko-for-raycast/issues/15)) ([7ecb065](https://github.com/JuanVqz/noko-for-raycast/commit/7ecb0657b3fb433b51da09a1450c4aaf2a6fdce8))
* **entries:** add entry creation action to entries view ([#19](https://github.com/JuanVqz/noko-for-raycast/issues/19)) ([9f60d56](https://github.com/JuanVqz/noko-for-raycast/commit/9f60d567c11c0bb2e767e4513f327c9292b87e5f))
* **ui:** improve navigation consistency ([#18](https://github.com/JuanVqz/noko-for-raycast/issues/18)) ([1f2e4c3](https://github.com/JuanVqz/noko-for-raycast/commit/1f2e4c3206f678cd14846e67c518e88a9331d4bb))
* update extension icon ([#21](https://github.com/JuanVqz/noko-for-raycast/issues/21)) ([8c2ef4e](https://github.com/JuanVqz/noko-for-raycast/commit/8c2ef4e4531fa14bf9b3b7274c45eb96177ba7f1))

## [0.3.0](https://github.com/JuanVqz/noko-for-raycast/compare/v0.2.0...v0.3.0) (2025-10-13)


### Features

* setup automated release management with Release Please ([#12](https://github.com/JuanVqz/noko-for-raycast/issues/12)) ([11d5061](https://github.com/JuanVqz/noko-for-raycast/commit/11d506139a2851b0c4f759ddbd8a2e426c22a97c))


### Bug Fixes

* update manifest to start from latest release v0.2.0 ([732babe](https://github.com/JuanVqz/noko-for-raycast/commit/732babeb1deb430bedca90e6aabd93a8c51b9d82))

## [Unreleased]

## [App] - 2025-10-10

### Fixed

- Fix timer pause functionality - now properly pauses timers and stops elapsed time updates
- Fix Log Timer time population - now shows actual elapsed time instead of default billing increment
- Fix tag hashtag support - tags now include hashtags when saved in entries

### Changed

- Improve timer state management and API response handling
- Optimize performance by removing debug logging

## [App] - 2025-10-08

### Added

- Code Improvements and Add Timer View

## [App] - 2025-10-06

### Changed

- Run linter

## [App] - 2025-10-06

### Changed

- Update dependencies

## [Project] - 2024-11-05

### Added

- Add Project enabled attribute

## [Entries] - 2024-10-26

### Added

- Add the ability to filter entries by day (yesterday, today, and tomorrow)
- Add approved by type

## [Entries] - 2024-10-05

### Added

- Add the ability to list entries
- Add NokoId input configuration

## [Initial Version] - 2024-09-19

### Added

- Add the ability to create new entries in Noko
