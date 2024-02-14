# Android Debug Bridge (Adb) Changelog

## [Fix wifi/airplane commands] - 2024-02-14
- Fix `wifi`, `airplane` commands. There was a problem fixing merge conflicts disregarding the usage of new toggle value.

## [Fix wifi/airplane commands] - 2024-02-13
- Fix `wifi`, `airplane` commands. ADB requires these commands to receive specific enable/disable arguments to be fully compatible.

## [Add toggle layout bounds command] - 2024-02-13
- Add `toggle layout bounds` command, disabled by default
- Change `wifi`, `airplane`, `dark mode` commands to toggle instead of taking arguments to enable/disable.

## [Add open device developer settings] - 2024-02-13
- Add `open developer settings` to open the locale developer settings
- Disable `adb-display-size` by default, since it's less used

## [Add font/display sizes commands] - 2023-06-13
- Add `display density` to control display density (values from 0.5 to 3.0)
- Add `font size` to control font sizes (vales from 0.5 to 3.0)
- Add `large display and font` to set display density and font size to maximum
- Add `reset display and font` to reset the values to default
- Change extension name to include Android in order to improve discoverability of the extension

## [ADB error fix] - 2023-06-08

- Check if `adb` exists before executing command

## [Initial Version] - 2023-06-02

- Added multiple commands:
  - `airplane` to toggle on/off the airplane mode
  - `dark-mode` to toggle on/off/auto the dark mode
  - `open locale settings` to open the locale settings
  - `open url` to open url such as deeplinks or other links
  - `screenshots` to take a screenshot, save it and put it on your clipboard
  - `wifi` to toggle on/off the wifi
  - `write` to write a text (like on an input)
