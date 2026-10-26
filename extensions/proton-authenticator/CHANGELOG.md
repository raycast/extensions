# Proton Authenticator Changelog

## [Fix multi-key decryption] - 2026-10-26

### Fixed

- Local Database mode no longer fails with "Failed to decrypt database" when entries are encrypted with different keys. Proton Authenticator uses one key per device plus one for Proton account sync, and the extension now decrypts each entry with the key matching its key ID.
- Entries whose key hasn't been added are skipped instead of failing the whole load. A toast says how many entries are affected and links to a list of the missing Keychain items, each with step-by-step instructions.
- The countdown ring next to each code shows again in the new Raycast app. It now uses Raycast's built-in progress icons.

### Changed

- Setup accepts several encryption keys and lists the Keychain account names your database needs.
- Existing single-key setups are migrated automatically.

## [Add live sync support] - 2026-01-20

### Added

- **Live Synchronization Support**: Read TOTP entries directly from Proton Authenticator's local database for automatic synchronization
- **Import Method Selection**: Choose between Local Database (live sync) or JSON export on first setup
- **Manual Refresh**: Use `Cmd+R` to refresh accounts from database in Local Database mode
- **Mode Indicator**: Navigation title shows current mode (Live/JSON)
- **Encryption Key Validation**: Real-time validation supporting both hex and base64 key formats

## [Initial Version] - 2025-08-11

Added initial version of Proton Authenticator extension
