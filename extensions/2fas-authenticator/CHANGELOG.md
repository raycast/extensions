# Changelog

## [Fix Author Attribution] - 2026-07-01

- Correct the extension author handle so it is credited to the right Raycast account

## [Initial Version] - 2026-06-30

### Commands

- Search OTP: browse all services with native Raycast filtering and a live TOTP countdown
- Recent OTP: quick access to pinned and recently used services with live codes
- Import Vault: import an encrypted `.2fas` export file
- Setup: vault status, lock, re-import, and delete

### Security

- AES-256-GCM encrypted local vault, key stored in the macOS login Keychain
- Atomic re-import with rollback: a failed parse, wrong password, or Keychain write leaves the existing vault and Keychain key intact
- Vault envelope is version-checked and shape-validated before decryption
- Deterministic service IDs (derived from issuer + account + secret) keep the recents cache stable across re-imports of the same export
- 5 MB cap on imported `.2fas` files
- In-memory cache has a 5-minute idle TTL and can be cleared on demand via "Lock Vault Now" in Setup
- Concealed clipboard copy (excluded from clipboard history)
- Copying an OTP closes the Raycast window and shows a HUD with the service label. The code itself is not displayed on screen.
- Zero network calls, zero external crypto dependencies (Node.js `crypto` only)
- Full threat model documented in `SECURITY.md`

### UX

- Live TOTP countdown with red/green color on the last 5 seconds
- Relative "last used" timestamps in Recent OTP ("2h ago", "yesterday")
- Animated "Unlocking vault…" toast during Keychain authentication
- Services with malformed secrets surface in a "Skipped" section instead of being silently dropped
