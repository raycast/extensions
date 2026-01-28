# Tailscale Changelog

## [Add new features] - 2025-07-30

- Distinguish Mullvad exit nodes from other exit nodes and show location

## [Add new features] - 2025-05-04

- Add `toggle connection` command

## [Fixes] - 2025-04-09

- Better handling of shared exit node ([#18258](https://github.com/raycast/extensions/issues/18258))

## [Add new features] - 2025-01-02

- Add `netcheck` command

## [Improvement] - 2024-11-08

- Provide UI indicator, and HUD message on `connect (tailscale up)` and `disconnect (tailscale down)` commands

## [Custom Admin Console URL] - 2024-07-05

- Add support for custom Admin Console URLs ([#12048](https://github.com/raycast/extensions/issues/12048))

## [Improvement] - 2024-05-23

- Remove trailing `.` from the end of MagicDNS addresses ([#12451](https://github.com/raycast/extensions/issues/12451))

## [Fixes] - 2024-04-09

- Increase default max buffers for `execSync` ([#10698](https://github.com/raycast/extensions/issues/10698))

## [Fixes] - 2024-04-08

- Fix buffer issue on large tailnets ([#10698](https://github.com/raycast/extensions/issues/10698))

## [Add new features] 2024-03-14

- Add connect (tailscale up)
- Add disconnect (tailscale down)

## [Improvements] - 2024-02-10

- Do not show Mullvad exit nodes in "All Devices" list
- Sort "All Devices", "My Devices", and "Exit Node" lists

## [Fixes] - 2023-12-29

- Fix account switcher command ([#9916](https://github.com/raycast/extensions/issues/9916))

## [Improved error handling] - 2023-09-30

- Added more explicit error views for when Tailscale isn't running, isn't connected, or isn't installed
- Fixes an error that prevented the "switch account" command from working

## [Add custom tailscale path] - 2023-09-07

- Added a preference for users to specify a custom path to the `tailscale` CLI

## [Improve UI for disconnecting exit node] - 2023-04-29

- Updated the icon and accessory text for the "Turn off exit node" action

## [Add new features] - 2023-04-19

- Added a command to view only devices owned by you
- Renamed "Network Devices" command to "All Devices"
- Added a command to quickly toggle between signed-in Tailscale accounts
- Added a command to select an Exit node
- Behind-the-scenes changes to how we fetch data from your local installation of Tailscale.
- Update screenshots
- Add contributors

## [Clean up action labels] - 2023-04-18

- Changed action labels like "Copy IPv4 address to clipboard" to "Copy IPv4"
- Changed "Admin Console" command to be `no-view`
- Removed unused variables and debug statements in code

## [Added Tailscale] - 2022-04-02

Initial version code
