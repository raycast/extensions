# GitHub Enterprise Changelog

## [Fix notification URLs for GitHub Enterprise Cloud] - 2025-11-21

- Fixed notification URLs for GitHub Enterprise Cloud instances
- Clicking on notifications from the menu bar now correctly opens the web URL instead of the API URL
- Maintains backward compatibility with GitHub Enterprise Server

## [Chore: Fixed typo while searching for issues] - 2025-09-02

## [Add Github Notifications] - 2024-05-31

- Add Github Notifications list command
- Add Unread Notifications in the macOS menu bar

This change requires additional permissions to the token:

- `read:org`
- `read:project`

## [Dependency Updates] - 2023-08-09

- Update graphql-request to v6

## [Dependency Updates] - 2022-02-07

- Updated dependencies for the extension

## [New Functionality] - 2022-04-20

- Added Unsafe HTTPS checkbox, so it's possible to use self-signed certificates
