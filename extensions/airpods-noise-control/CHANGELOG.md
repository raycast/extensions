# AirPods Noise Control Changelog

## [Major Update] - {PR_MERGE_DATE}

> **⚠️ Breaking Change**: This update moves preferences from per-command to global extension level. You will need to reconfigure your preferences in Extension Settings after updating.

### Fixed
- **macOS 26 Tahoe Compatibility**: Complete rewrite of Control Center script to fix "Could not run AppleScript" error on macOS 26 Tahoe (Darwin 25+)
  - Fixed Control Center UI hierarchy changes where Sound controls are no longer accessible as a separate menu bar item
  - Rewritten to navigate through nested Control Center → Sound module → device list structure
  - Implements dual-script approach: tries direct Sound menu access first, falls back to nested Control Center navigation
- **Conversation Awareness Toggle**: Fixed checkbox offset calculation to properly account for Spatial Audio in the UI hierarchy
  - Dynamically adjusts offset based on layout type: position 5 for 3-mode layouts (AirPods Max), position 6 for 4-mode layouts (AirPods Pro)
  - Now correctly identifies CA checkboxes after all listening mode options (Off/Transparency/Adaptive/Noise Cancellation)
  - Fixed logic to properly detect current state and toggle between On/Off
- **Type Safety**: Fixed airpodsIndex type handling where textfield preference returns string but was incorrectly typed as number
  - Added explicit string-to-number conversion using parseInt() in both command files
  - Created separate ExecPrefs interface for proper type safety in execAirPodsMenu function

### Added
- **Intelligent Retry Logic**: Up to 3 attempts to open Control Center window with proper state cleanup between retries
- **Detailed Error Messages**: 8 specific error codes for better debugging and user feedback
  - `error-control-center-not-found`: Control Center icon not found in menu bar
  - `error-control-center-window-not-found`: Control Center window failed to open after retries
  - `error-sound-module-not-found`: Sound module not detected in Control Center (no volume slider found)
  - `error-scroll-area-not-found`: Could not access device list scroll area
  - `error-airpods-index-too-high`: Configured AirPods index exceeds available device count
  - `error-airpods-checkbox-lost`: Lost reference to AirPods checkbox after disclosure triangle expansion
  - `error-insufficient-mode-checkboxes`: Could not find expected noise control mode options
  - Generic error handling with `error:` prefix for unexpected AppleScript failures
- **Layout Validation**: Added checkbox count validation to verify layout type matches device configuration (overrides to 4-mode if 6+ candidates detected)
- **Dual-Script Approach**: Fast path attempts direct Sound menu bar access, automatically falls back to nested Control Center approach if unavailable

### Changed
- **Preferences Architecture**: Moved preferences from per-command to global extension level
  - Affects: `optionOne`, `optionTwo`, `showHudNC`, `showHudCA`
  - Users must reconfigure preferences in Extension Settings (not per-command settings)
  - Provides more consistent configuration experience across all commands

### Improved
- **Reliability**: Robust window state management with automatic cleanup of stale Control Center states before retry attempts
- **Detection Strategy**: Index-based UI element detection using volume slider identification instead of fragile name-based menu search
- **Error Handling**: Graceful failure handling with proper ESC key cleanup in all error paths to prevent UI state corruption
- **Code Quality**: Removed all debug logging and console output for production readiness

### Technical
- **Dual-Script Execution Strategy** with automatic fallback:
  - **Approach 1 (Fast Path)**: Direct Sound menu bar access
    1. Search for Sound menu bar item by description
    2. Click to open Sound menu window
    3. Find scroll area and locate AirPods device
    4. Expand disclosure triangle and extract mode checkboxes
    5. Execute toggle with calculated offset
  - **Approach 2 (Fallback)**: Nested Control Center navigation
    1. Find and click Control Center menu bar icon
    2. Locate Sound module via volume slider detection
    3. Click Sound module to expand device list
    4. Find scroll area with retry logic (up to 3 attempts)
    5. Parse checkboxes before and after disclosure triangle expansion
    6. Extract mode candidates dynamically
    7. Determine layout type with validation
    8. Execute toggle with calculated offset
  - **Execution Flow**: Attempts Approach 1 first, automatically falls back to Approach 2 if Sound menu not found or script fails
  - Approach 1 provides ~30% performance improvement when available
  - Approach 2 works consistently on all macOS 26 Tahoe systems
- **Architecture Changes**:
  - Removed helper functions: `getMaxOptionIndex()`, `getProOptionIndex()` (replaced with dynamic detection)
  - Mode detection based on actual checkbox count rather than pre-calculated static indices
  - Created `ExecPrefs` interface with parsed number type for `airpodsIndex` parameter
  - Conversation Awareness offset calculation accounts for Spatial Audio checkbox in sequence
  - Both scripts share same toggle logic and offset calculation
- **Backward Compatibility**: Maintains legacy SystemUIServer script for pre-Sequoia macOS versions

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
