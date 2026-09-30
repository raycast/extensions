# Connect to VPN Changelog

## [Bug fix] - 2026-09-21

- Tint the menu bar icon with the menu bar text colour, so it no longer stays black on a dark menu bar
- Check service status without blocking, so the background refresh no longer stalls the extension for close to two seconds every 30 seconds
- Stop the menu bar from signalling itself, which made it refresh every service in a loop and log a failed attempt to launch itself
- Stop holding a command open while a connection is being set up, which made Raycast report an unloaded worker when another action ran at the same time
- Mark a service as Connecting or Disconnecting while it changes, in both the menu bar and the list
- Show a connection or disconnection about 160 ms sooner on average
- Read every VPN status from one `scutil` call instead of one `networksetup` call per service, which cuts loading from around 350 ms to under 50 ms and spawns two processes instead of ten
- Skip the duplicate refresh the menu bar did on every launch
- Treat an unrecognised status from `networksetup` as invalid
- Remember the last used service under its real name, so a service with quotes in its name can be toggled
- Show the error toast once per error instead of on every re-render
- Update to Raycast API 2

## [New Additions] 2025-04-05

- Implemented a new command to toggle the last used VPN connection

## [Performance Improvements] 2025-03-19

- Significantly improved menubar icon update speed when connecting/disconnecting via main Raycast interface
- Fixed synchronization issues between main extension and menubar
- Added direct communication between commands for instant status updates
- Optimized status checking for faster response time
- Contributed by @borzov

## [Bug fix] - 2024-12-22

- Fixed spawning zombie process while updating services status in background

## [New Additions] - 2024-11-13

- Menu bar icon updates in the background

## [New Additions] - 2024-06-30

- Menu bar icon reflects current connection status

## [New Additions] - 2024-06-23

- Menu bar command

## [New Additions] - 2024-06-06

- Option to hide non-VPN services
- Ascending/Descending sorting of services by name or type
- Add Favorites and allow reordering
- Header by service type
- Open Network Settings from extension

## [Bug fix] - 2024-01-15

- Escape network names with quotes

## [New Additions] - 2023-08-23

- Sort network services based on availability.
- Updated internal dependency packages.
- New maintainer of the extension, @rasmusbe. Thank you @sato11 for all your previous work with the extension.

## [Initial Version] - 2022-02-17
