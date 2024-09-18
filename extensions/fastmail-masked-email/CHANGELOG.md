# Fastmail Masked Email Changelog

## [Added View In Fastmail] - 2024-02-23

Added `View in Fastmail` action when listing all masked emails

## [Misc Extension Updates] - 2024-02-21

- Added preferences to show / hide pending & deleted masked emails when listing all masked emails
- Updated UI labels to better match Fastmail's UI: `Enabled` -> `Active`, `Disabled` -> `Blocked`
- Added preference to set the default prefix for newly created masked emails
- Added optional prefix field to the create command (Autofills with the default prefix)
- Added additional actions when listing all masked emails: `Block`, `Unblock`, `Delete` and `Restore`
- Added quick create command to create a masked email without any prompts
- Immediately pop to root after creating a masked email
- Updated extension dependencies
- Misc refactoring and cleanup

## [Added List Command] - 2023-07-24

Added list command to list all masked emails

## [Initial Version] - 2022-10-12

Initial version
