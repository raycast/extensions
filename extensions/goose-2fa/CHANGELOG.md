# Goose 2FA Changelog

## [Initial Release] - 2026-10-15

- Export individual accounts as locally generated QR codes, standard otpauth setup links, or Base32 secret text for another authenticator.
- Keep exported OTP parameters current without advancing HOTP counters; use confidential clipboard copies.
- Isolate data-source changes from pending reads and writes.
- Create local TOTP and HOTP accounts from pasted secrets or screenshot/image QR codes; review and edit account details before saving.
- Hide Raycast during screenshot capture, then reopen the extension with the scanned account form or results list.
- Search accounts by issuer, name, notes, or group and copy or paste generated codes.
- Manage accounts, groups, and trash from a single command, with JSON import/export and an optional shared data source compatible with Goose 2FA for uTools.
