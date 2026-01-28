# Proton Authenticator Changelog

## [Add live sync support] - 2026-01-20

### Added

- **Live Synchronization Support**: Read TOTP entries directly from Proton Authenticator's local database for automatic synchronization
- **Import Method Selection**: Choose between Local Database (live sync) or JSON export on first setup
- **Manual Refresh**: Use `Cmd+R` to refresh accounts from database in Local Database mode
- **Mode Indicator**: Navigation title shows current mode (Live/JSON)
- **Encryption Key Validation**: Real-time validation supporting both hex and base64 key formats

## [Initial Version] - 2025-08-11

Added initial version of Proton Authenticator extension
