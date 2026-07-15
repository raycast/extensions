# Windows Terminal Changelog

## [Fix Starting Directory] - 2026-07-01

- Fixed profiles launching in System32 instead of the user's home when no `startingDirectory` is set

## [Fix SSH Profiles] - 2026-06-15

- Fixed SSH profiles by preserving the Windows OpenSSH path when launching Windows Terminal

## [Quake Window Preference] - 2026-05-22

- Added the `Open profiles in quake window` preference. When enabled, the primary "Open Profile" action and the "Open as Administrator" action both route into Windows Terminal's quake (drop-down) window via `wt.exe -w _quake`.

## [Quality of Life Enhancements and Fixes] - 2026-01-14

- Fixed a bug where profiles won't start due to the main window closing early
- Improved handling of WSL profiles
- Added handling of SSH profiles generated via the SSH configuration file

## [Added Windows Terminal] - 2025-12-15

Initial version code
