# ssh-manager Changelog

## [Read SSH Hosts from ~/.ssh/config] - 2023-09-11

- Allow auto suggest of SSH hosts defined in `~/.ssh/config` file

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
