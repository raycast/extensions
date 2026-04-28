# Brightness Control Changelog

## [Fix Brightness Down bug] - 2026-04-28

- "Brightness Down" failed with "Error: Unknown option '-10'" since subprocess evaluates the "-10" as an argument. Added a leading "--" to prevent it.

## [Update] - 2026-04-28
- Add windows support
- Update packages

## [Fix Brightness Up/Down hotkey bug] - 2026-04-15

- Fixed "Brightness Up" and "Brightness Down" silently failing when triggered via a hotkey ([raycast/extensions#27085](https://github.com/raycast/extensions/issues/27085)). The commands now use Lunar's relative brightness CLI (`displays <serial> brightness +/-N`) instead of synthesizing brightness key codes via AppleScript, so held hotkey modifiers no longer suppress the adjustment.
- "Brightness Up" and "Brightness Down" now require [Lunar](https://lunar.fyi/), matching the existing "Set Brightness" and "Max Brightness" commands. Lunar is auto-installed via Homebrew on first use.
- HUD now shows the resulting display name and brightness percentage instead of a static "Brightness increased/decreased" message.
- Removed the `run-applescript` dependency.

## [Lunar-based Brightness Control] - 2026-02-18

- Added "Set Brightness" command: set exact brightness level (1-100) directly from the search bar using Lunar
- Added "Max Brightness" command: instantly set brightness to 100% on the current display
- Automatic cursor-based display detection
- Auto-install Lunar app via Homebrew and CLI on first use

## [Initial Version] - 2022-08-03

Added the ability to increase/decrease the brightness of the screen.
