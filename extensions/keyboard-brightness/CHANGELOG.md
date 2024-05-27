# Keyboard Brightness Changelog

## [Fix] - 2024-05-03
- Resolved an issue where brightness value can go below 0 or above 100 if value is not incremented by every 10th percentage.

## [Fix] - 2024-04-26

- Resolved an issue where an error message would appear if the menu bar command was disabled.

## [Improve user feedback and error handling] - 2024-04-10

- Remove adjust-brightness command as it is replaced by increase-brightness and decrease-brightness commands.
- Improve user feedback and error handling by showing the new brightness value when adjusted.
- Force displayed brightness to be whole percentage values.

## [Add separate increase/decrease brightness commands] - 2024-04-07

- Add separate increase/decrease brightness commands in order to support convenient keyboard shortcuts for both actions.

## [Initial Version] - 2023-10-19
