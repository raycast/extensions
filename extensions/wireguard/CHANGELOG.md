# Wireguard Changelog

## [Add Toasts and Huds] - 2024-12-03

- `showToast` then `showHud` on **toggle**
- `showToast` then `showHud` on **disconnectAll**

## [Fixed] - 2023-11-28

- Fixed VPN not starting via `scutil` with too long a name

## [Fixed] - 2023-11-23

- Fixed the issue where quotes at the end of a name were omitted when the name was more than 30 characters long

## [Feature] - 2023-04-26

- Add the feature of displaying national flags.

## [Changed] - 2023-04-14

- Improve the performance of fetching lists when there are too many configurations.

## [Feature] - 2023-03-24

- Add `disconnectAllWireguardConnections` command.

## [Fixed] - 2023-03-23

- Fixed connection name contains space character, detail: https://github.com/raycast/extensions/issues/5484.

## [Feature] - 2023-03-14

- Improve no result prompt

## [Initial Version] - 2023-03-01

- Adding basic functionalities (connect/disconnect), support for multiple servers.
