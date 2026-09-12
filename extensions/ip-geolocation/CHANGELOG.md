# IP Geolocation Changelog

## [New Icon Style] - 2025-07-16

- Optimize extension icons for macOS Tahoe

## [Fix Auto Close Window] - 2024-08-12

- Fix the problem that the Raycast window is automatically closed when the Copy IP command is refreshed in the background.
- Refactor the code to simplify the logic and improve the performance
- Remove the time display for the time zone
- Update icons and styles

## [Fix Hotkey Error] - 2024-05-27

-  Fix the problem of using hotkeys to invoke commands

## [Copy IP] - 2024-05-27

- Copy IP command allows you to choose whether to copy local/public IPv4/IPv6
- Optimise the style of extension icons

## [Fix] - 2023-11-22

- Fixing the IPv4 match

## [Improvement] - 2023-11-16

- Support IPv6 for query
- Remove URI if user submit a domain
- Check the IP address is a valid IP before submit to API
- Bump up the libraries version

## [Command metadata] - 2023-08-14

- Command metadata: show IP address in the command palette

## [New command] - 2023-02-07

- New command: Copy Local IP Address
- Now display IPv4 and IPv6 information separately

## [Update UI] - 2022-12-05

- Update UI: new extension icon, new information icon
- Update Raycast API version to 1.44.0

## [Support arguments for command] - 2022-08-07

- Support arguments for command so that you can enter values right from Root Search before opening the command

## [Update command name] - 2022-05-27

- Update command name
- Add _Open Extension Preferences_ action
- Add _Show IPv6 Address_ preference
- Add time for TimeZone

## [Initial Version] - 2022-05-15

- Show local and public IP, lookup geolocation for any IP address or domain.
