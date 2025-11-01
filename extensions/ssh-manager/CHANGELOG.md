# SSH Manager Changelog

## [Select SSH Config File] - 2025-08-04

- Select SSH Config File (ref: [Issue #19941](https://github.com/raycast/extensions/issues/19941))
- Replace `useEffect` with `usePromise`
- In Create, "name" is now `Required`
- Add README.md
- Add metadata images
- Remove `Preferences` type
- Remove `.trunk` folder
- Use Raycast Utils `run-applescript`

## [Add Ghostty Support] - 2025-04-04

- Added support for Ghostty as an option to open ssh connections.

## [Improvements] - 2025-03-25

- ⚠️ Add Confirmation Dialog to Delete Connectionssd
- 📦 Bump all dependencies to the latest

## [New Feature and Improvements] - 2025-02-27

- 📋 Add `Copy Connection String`
- 🧑‍💻 Update action panel with new API
- 💬 Better HUD prompts

## [Add Hyper Support] - 2024-09-07

- Added support for Hyper as an option to open ssh connections.

## [Add Alacritty Support] - 2024-04-09

- Added support for alacritty as an option to open ssh connections.

## [Fix] - 2024-04-08

- Fixed the issue that `User` options are still created when `User` is not specified.

## [New field: Only use Host] - 2024-01-31

- Added the option to let users choose whether to use Host only for ssh connections without other parameters. e.g., `ssh Host`

## [Fix RemoteCommand parsing] - 2024-01-18

- Fixed a bug where a remote command of a connection was not correctly parsed if the remote command contains multiple spaces.

## [Fix] 2024-01-11

- SSH Config Parsing: Fix a bug where wildcard entries like `Host *` defined in `~/.ssh/config` would show up as connections.
- SSH Config Parsing: Fix a bug where RemoteCommand in SSH configurations was incorrectly parsed, leading to incomplete commands being sent to the terminal.

## [Fix] - 2023-11-22

- Fixed a bug where a connection with a remote command did not work properly while saving.

## [Modify hosts from ~/.ssh/config] - 2023-09-20

- This change adds the ability to view/modify ssh hosts from ~/.ssh/config file in addition to localStorage

## [Make user field optional] - 2023-09-06

- Make user field optional in connection config - to support user-less hosts (e.g. pseudo hosts that are configured in `~/.ssh/config`)

## [New field: Command to execute] - 2023-08-30

- Added a new optional field to execute a command on the remote server after logging in.

## [New window or tab] - 2023-05-16

- Adding preference to allow the user to define which way the new SSH-Connection will be opened.

## [Add Warp Support] - 2022-11-18

This version adds the option to add ssh connections in Warp.
Checkout the preferences and select Warp in the dropdown to get going.

## [Add support to custom port] - 2022-07-08

This version adds option to set custom port (other than `22`) in SSH connections.

## [Add iTerm Support] - 2022-06-28

This version adds the option to add ssh connections in iTerm.
Checkout the preferences and select iTerm in the dropdown to get going.

## [Initial Version] - 2022-04-05
