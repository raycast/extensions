# Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Added

- **List 2FA Codes**: View all your 2FA accounts with live TOTP codes
  - Real-time countdown timer showing seconds until code refresh
  - Color-coded timer (green → yellow → orange → red) as expiration approaches
  - Auto-refresh codes when timer resets
  - Copy code to clipboard with a single action
  - Search and filter accounts
  - Unique icons and colors for each account
  - Empty state when no accounts are configured

- **Add 2FA Account**: Add new accounts via the Raycast interface
  - Base32 secret key validation
  - Automatic navigation to account list after adding
