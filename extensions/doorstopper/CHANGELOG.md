# Doorstopper Changelog

## [Timers, Auto-Off and Passwordless Mode] - {PR_MERGE_DATE}

- Added Enable Doorstopper for Duration, with 30 minute to 4 hour presets, typed durations like `45m`, `1h30` or `2.5h`, and recent durations in the menu bar.
- Added Set up Passwordless Doorstopper, which installs an optional sudoers rule that allows only `pmset -a disablesleep 0` and `pmset -a disablesleep 1`, so toggling no longer asks for a password or Touch ID.
- With the rule installed, the menu bar disables Doorstopper when a timer ends, when the battery drops to the Low Battery Cutoff (default 20%, on battery power only), or after the Mac restarts.
- The menu bar shows the time left on a timer, and Doorstopper Status shows it in its subtitle.
- Added a Default Duration preference for Toggle Doorstopper. It defaults to Indefinitely, so Toggle works as before.
- Without the rule, Enable, Disable and Toggle keep asking for Touch ID or your password as before.
- Updated `@raycast/api` to `^2.7.3` and added tests.

## [Fix Menu Bar Toast] - 2026-08-12

- Fixed a misleading failure toast after toggling Doorstopper when the optional menu bar command is disabled.

## [Touch ID Authentication] - 2026-07-23

- Added Touch ID authentication for changing Doorstopper settings when Touch ID is enabled for `sudo`

## [Update Raycast Dependencies] - 2026-07-22

- Updated `@raycast/api` from `^1.94.0` to `^1.104.9` and `@raycast/utils` from `^1.17.0` to `^2.2.7`.

## [Add Doorstopper] - 2025-03-21

Initial version
