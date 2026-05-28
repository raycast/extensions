# Private 2FA Codes

A private Raycast extension that computes TOTP codes from accounts stored in Raycast local storage.

## Privacy

The extension stores accounts in Raycast's local encrypted database via `LocalStorage`. It does not upload, log, or copy your secrets into this repository.

## Supported inputs

- `otpauth://totp/...` URLs in plain text, JSON, CSV, or any text file
- `otpauth-migration://offline?...` URLs from Google Authenticator migration QR data
- 2FAS-style JSON backups when the backup is not encrypted
- Aegis-style JSON exports when the export is not encrypted
- Bitwarden JSON exports containing `login.totp`
- `private-2fa-codes` JSON files with `entries[].name` and `entries[].secret`

Encrypted exports are intentionally rejected. Decrypt/export them from the authenticator app first, then point Raycast at the local decrypted file.

## Editing accounts

- `Add Account` creates a new TOTP account from a display name and base32 secret.
- `Edit Account` changes the display name and/or secret.
- `Delete Account` removes the account after confirmation.
- `Import From File` imports existing accounts from an authenticator export. You can merge them into the current list or replace all existing accounts.

## Local use

```bash
npm install
npm run dev
```

Then open Raycast and run `List 2FA Codes`.

## Private publishing

This package is marked `private: true` for npm and local use. If you want to publish it to a Raycast team private store, set `owner` in `package.json` to your organization handle, set `access` to `private`, and run:

```bash
npm run publish
```
