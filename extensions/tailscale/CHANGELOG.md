# Tailscale Changelog

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
