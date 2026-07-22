# Windows Terminal Changelog

## [Always Open Administrator in a Normal Window] - 2026-07-22

- "Open as Administrator" now always launches into a regular window, regardless of the `Open profiles in quake window` preference. Elevated quake windows don't respond to Windows Terminal's global quake shortcut (Win+`), so routing admin through quake left users unable to summon the drop-down back once it lost focus. The separate "Open as Administrator (Non-Quake)" action added in the previous release is no longer needed and has been removed.
- Skipped loading the PowerShell profile when spawning the elevated launcher (`powershell -NoProfile`), which noticeably cuts the delay between triggering the action and the UAC prompt.

## [Non-Quake Admin Action] - 2026-07-22

- Added an "Open as Administrator (Non-Quake)" action (⌃↵) that appears while the `Open profiles in quake window` preference is on, so users can still open an elevated session in a normal window — elevated quake windows don't respond to the global quake shortcut (Win+`).

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
