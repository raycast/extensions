# Display Brightness Control Changelog

## [Single Command Multi-Display Control] - {PR_MERGE_DATE}

- Added one interactive `Control Brightness` command with a connected display list
- Added keyboard shortcuts:
  - `Cmd + Right Arrow` to increase brightness by 10%
  - `Cmd + Left Arrow` to decrease brightness by 10%
- Added action menu support for:
  - Set Brightness
  - Increase Brightness
  - Decrease Brightness
  - Reset to 100%
- Added direct brightness input with integer validation in the range `0-100`
- Added user-triggered automatic Lunar setup (Homebrew + install-cli) with retries and manual fallback actions
- Added retry/backoff logic for transient Lunar socket and empty-display states
- Updated extension icon and UI brightness meter to 10-segment filled/empty rectangles
