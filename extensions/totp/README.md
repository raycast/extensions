# TOTP

A private, local-first TOTP authenticator for Raycast.

## Commands

- **TOTP** — search saved accounts, copy or paste the current OTP, add/remove accounts, and import/export backups.
- **Quick OTP** — generate and copy an OTP from a Base32 secret or `otpauth://` URI without saving it. Use **Add Account** to save the current input.

## Storage and Backups

Accounts and secrets are stored locally in Raycast's encrypted storage. They do not sync automatically between Macs.

Use **Export Encrypted Backup** to create an AES-256-GCM encrypted backup in `~/Downloads`. Keep its passphrase safe: it is never stored and cannot be recovered. Use **Import Encrypted Backup** on a new Mac to merge the backup's accounts.

## Security

- OTPs and copied secret keys are concealed from Raycast Clipboard History.
- The extension makes no network requests.
- Never share an exported backup and its passphrase together.
