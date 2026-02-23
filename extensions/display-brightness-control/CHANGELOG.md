# Display Brightness Control Changelog

## [Single Command Multi-Display Control] - {PR_MERGE_DATE}

- Added one interactive `Control Brightness` command with a connected display list
- Added keyboard shortcuts:
  - `Cmd + Right Arrow` to increase brightness by 10%
  - `Cmd + Left Arrow` to decrease brightness by 10%
  - `Cmd + Shift + Right Arrow` to set brightness to `100%`
  - `Cmd + Shift + Up Arrow` to set brightness to `50%`
  - `Cmd + Shift + Left Arrow` to set brightness to `0%`
  - `Cmd + R` to refresh displays
- Added action menu support for:
  - Set Brightness
  - Increase Brightness
  - Decrease Brightness
  - Set to `100%`
  - Set to `50%`
  - Set to `0%`
  - Refresh Displays
- Added direct brightness input with integer validation in the range `0-100`
- Added user-triggered automatic Lunar setup (Homebrew + install-cli) with retries and manual fallback actions
