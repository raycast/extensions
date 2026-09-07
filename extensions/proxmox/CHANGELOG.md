# Proxmox Changelog

## [Multiple Servers] - 2026-09-07

- Added support for multiple Proxmox servers ([#27260](https://github.com/raycast/extensions/issues/27260))
- Added a `Manage Servers` command to add, edit or remove servers
- The VM and storage lists now show the resources of all configured servers, grouped per server
- An unreachable server no longer hides the results of the other servers
- The server configured in the extension preferences keeps working as before
- VM actions now check the HTTP status of the response, failed actions no longer show a success toast
- Added mock data for the storage list, used for development and store screenshots

## [Updates] - 2025-12-12

- Cleanup codebase, refactored almost all code to separate files
- Added action to open a Qemu/LXC dashboard in the browser
- Added storage list and details
- Added action to show the contents of a storage
- Removed the mock data, made it optional in the code to use it, instead of depending on an ENV variable
- Updated screenshots
- Added a small troubleshooting section in the README
- Added Windows support

## [Maintenance Release] - 2025-09-05

- show status in `tooltip`
- token is now password
- modernize to use latest Raycast config

## [Handle Errors] - 2024-07-17

## [Added Pause/Resume VM] - 2024-04-05

## [Added VM details panel] - 2024-03-25

## [Initial Version] - 2024-01-28
