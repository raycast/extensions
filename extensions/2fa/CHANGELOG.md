# Changelog

## [Initial Release] - 2025-02-25

### Added

- **List 2FA Codes**: View all your 2FA accounts with live TOTP codes
  - Real-time countdown timer showing seconds until code refresh
  - Color-coded timer (green → yellow → orange → red) as expiration approaches
  - Auto-refresh codes when timer resets
  - Copy code to clipboard with a single action
  - Search and filter accounts
  - Unique icons and colors for each account

- **Add 2FA Account**: Add new accounts via the Raycast interface
  - Support for 6, 7, and 8 digit codes
  - Support for both TOTP (time-based) and HOTP (counter-based) codes
  - Base32 secret key validation
  - Automatic navigation to account list after adding
