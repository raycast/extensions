# Proton Authenticator Changelog

## [Fix database access on macOS 27] - 2026-11-02

### Fixed

- When macOS blocks Raycast from reading Proton Authenticator's data, Local Database mode now says so and explains how to allow access in Privacy & Security, with a button that opens the settings. Previously it showed "Failed to query database. Make sure sqlite3 is available" or "Failed to decrypt database. Please check your encryption key".
- Other database errors now show the actual sqlite error instead of a generic message.
- If the database can't be read on launch, the extension opens Local Database setup with the error instead of the mode selector.

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
