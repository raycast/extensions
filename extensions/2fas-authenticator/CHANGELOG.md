# Changelog

## 1.1.0 — 2026-05-14

### Security

- Re-import is now atomic: a failed parse or wrong password leaves the existing vault and Keychain key untouched. Previously, a failed re-import could destroy the vault.
- Vault file envelope is now version-checked and shape-validated before decryption.
- Service IDs are now deterministic (derived from issuer + account + secret), so re-importing the same export preserves the recents cache.
- Removed the module-level base32 secret cache that retained decoded secrets for the process lifetime.
- Vault file size is capped at 5 MB during import.
- Added an in-memory cache TTL (5 min) and a "Lock Vault Now" action in Setup.
- New `SECURITY.md` documents the threat model.

### Changed

- Recents now show inline TOTP codes with a live countdown, matching Search OTP.
- Recents show relative timestamps ("2h ago") instead of date-only.
- Copying an OTP now closes Raycast and shows a HUD with the service label and code, so you can switch directly to the app you're authenticating to.
- Search OTP surfaces services with malformed secrets in a "Skipped" section instead of silently dropping them.

### Migration

- The recents cache is wiped once on first launch after this update because service IDs changed shape. Recents will rebuild as you use Search OTP.

## 1.0.0 — 2026-03-07

### Added

- Search OTP command with native Raycast filtering and live TOTP countdown
- Recent OTP command with pinned and recently used services
- Import Vault command for encrypted `.2fas` export files
- Setup command for vault status and management
- AES-256-GCM encrypted local vault with macOS Keychain key storage
- Concealed clipboard copy (excluded from clipboard history)
- RFC 6238 TOTP generation supporting SHA1, SHA256, SHA512
