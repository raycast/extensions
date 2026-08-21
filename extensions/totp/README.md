# TOTP

A private, local-first TOTP authenticator for Raycast.

Unlike extensions tied to a specific provider or authenticator export format, TOTP works directly with standard Base32 secrets and `otpauth://` URIs. It has no network integration, no Keychain dependency, and no external app requirement.

## Commands

- **TOTP** — search saved accounts, copy or paste the current OTP, add/remove accounts, and import/export backups.
- **Quick OTP** — generate and copy an OTP from a Base32 secret or `otpauth://` URI without saving it. Use **Add Account** to save the current input.

## Why TOTP?

- Works with any standard TOTP provider, not a single service or companion app.
- Supports SHA-1, SHA-256, SHA-512, custom digits, and custom periods from standard URIs.
- Keeps Quick OTP sessions ephemeral unless you explicitly save them.
- Includes encrypted, portable backups for moving accounts between Macs.

## Storage and Backups

Accounts and secrets are stored locally in Raycast's encrypted storage. They do not sync automatically between Macs.

Use **Export Encrypted Backup** to create an AES-256-GCM encrypted backup in `~/Downloads`. Keep its passphrase safe: it is never stored and cannot be recovered. Use **Import Encrypted Backup** on a new Mac to merge the backup's accounts.

## Security

- OTPs and copied secret keys are concealed from Raycast Clipboard History.
- The extension makes no network requests.
- Never share an exported backup and its passphrase together.
