# AirPods Noise Control Changelog

## [Major Update] - 2025-12-08

> **Note:** This update has only been tested on macOS Tahoe (26).

### macOS Tahoe Support
- Updated AppleScript to work with the new ControlCenter process on macOS Tahoe
- Added backward compatibility for pre-Sequoia macOS versions using SystemUIServer

### New Features
- Added **AirPods Type** preference to select between AirPods Pro and AirPods Max
- Different menu layouts are now properly handled for each AirPods model:
  - **AirPods Max**: Off, Transparency, Noise Cancellation
  - **AirPods Pro**: Transparency, Adaptive, Noise Cancellation + Conversation Awareness

### Bug Fixes
- Fixed disclosure triangle selection to target the correct AirPods item
- Fixed conversation awareness indices
- Added validation to show error when "Adaptive" mode is selected for AirPods Max
- Fixed `entire contents` statement missing object reference

### Performance
- Reduced delays for faster execution

## [Bug Fix] - 2025-04-15

- Fixed incorrect logic selecting "Adaptive" instead of "Transparency" in Noise Control toggle

## [Bug Fix] - 2024-11-14

- Fixed incorrect sound menu expand toggle index computation on macOS Sequoia
- Gracefully handle AppleScript runtime errors

## [Improvements] - 2024-03-09
- Typo fixed.
- Added current mode in the subtitle of both commands.

## [Improvements] - 2024-01-03
- Added `Off` Mode
- Main function fixed

## [New Additions] - 2023-11-28

- Added adaptive option in noise control
- Added `Toggle Conversation Awareness` command

## [Initial Version] - 2023-02-16

- Published the first version of the extension.
