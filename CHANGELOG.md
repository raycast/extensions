# AirPods Noise Control Changelog

## [Unreleased]

### Fixed
- **macOS 26 Tahoe Compatibility**: Complete rewrite of Control Center script to fix "Could not run AppleScript" error on macOS 26 Tahoe (Darwin 25+)
- Fixed Control Center UI hierarchy changes introduced in macOS 26 where Sound controls are no longer a separate menu bar item

### Improved
- **Performance**: Optimized execution speed by 60-67% across all operations (~2 seconds faster total)
  - Control Center open: 2.0s → 0.8s
  - Sound module expand: 1.5s → 0.5s
  - Disclosure triangle: 0.5s → 0.2s
  - Other operations: 0.3s → 0.1s
- **Code Quality**: Reduced AppleScript from ~630 lines to ~300 lines (53% reduction)
- **Reliability**: Added intelligent retry logic (up to 3 attempts) for Control Center window
- **Error Handling**: Added 8 specific error messages for better debugging and user feedback

### Technical
- Replaced complex name-based UI search with robust index-based approach
- Direct detection of sound module via "volume" slider
- Better handling of stale Control Center states
- Maintains backward compatibility with legacy script for pre-Sequoia macOS

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
