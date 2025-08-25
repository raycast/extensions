# Ente Auth Changelog

## [Windows Support] - 2025-08-25

- Added windows support

## [Bug fix] - 2025-07-11

- removed flickering "no secrets found" message when opening the extension
- slightly updated "no secrets found" message

## [Bug fix] - 2025-05-12

- fix variable for assigning user preferred values
- removed overwrite options as that is done by default now

## [Enhancements & Fixes] - 2025-05-08

- Import command now performs all necessary setup actions automatically
- Added a new "overwrite preference" action for finer control over import behavior
- Introduced dynamic icon support for improved visual feedback
- Set unused tasks to be disabled by default
- Improved path resolution using preferences
- Renamed primary action variable for clarity
- Refactored command and function naming for consistency
- Corrected `stripServiceName` logic to handle edge cases
- Restructured imports and added logging when folders already exist

## [Bug fix] - 2024-11-14

- Allow path to be resolved during runtime (e.g ~/Desktop/Ente)

## [Update Readme] - 2024-11-14

- Fix a typo in the readme

## [Bug fix] - 2024-11-13

- Added PR-15036 changes contributed by albarin

## [New Additions] - 2024-11-13

- Add the ability to change preferred actions; e.g. (paste or copy on enter)

## [Bug fix] - 2024-08-28

- Fix error in `Get TOPT` command when secrets are empty

## [Initial Version] - 2024-08-28
