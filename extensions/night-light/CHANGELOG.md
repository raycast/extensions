# Night Light Changelog

## [Find nightlight in either Homebrew prefix] - 2026-10-12

- Look for the `nightlight` CLI in both `/opt/homebrew/bin` and `/usr/local/bin`, and show how to install it when it is missing instead of a raw shell error ([#29427](https://github.com/raycast/extensions/issues/29427))

## [Fix Color Temperature Not Applying] - 2026-07-15

- Fixed the "Change Night Shift Color Temperature" command not applying the temperature because the view was dismissed (`popToRoot`/`closeMainWindow`) before the `nightlight` CLI command executed. The command now runs before the window is dismissed.

## [Add Custom Path] - 2023-11-25

- Support custom installation path

## [Add Extension Preferences] - 2023-06-01

- Add preference setting to close Raycast window
- Upgrade dependencies

## [Initial Version] - 2022-07-20

- Added turn night shift on command
- Added turn night shift off command
- Added toggle night shift command
- Added change night shift temperature command
