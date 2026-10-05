# Goose 2FA

A standalone Raycast extension for managing local TOTP and HOTP accounts. Open **Codes** to search accounts, copy codes, or paste them into the previous app. Use the command's action panel to manage accounts, scan QR codes, and import or export a JSON backup.

Choose a list or grid and configure Return behavior in the extension preferences. The interface is in English; account names may contain Chinese text.

## Optional shared data source

Accounts are stored locally in Raycast by default. To use a shared data source, select an existing JSON file in the **Data Source File** preference, or open **Codes → Settings & Data** to create one in a folder you choose. You can select the same iCloud Drive file in Goose 2FA on another Mac. iCloud file synchronization is not instantaneous or a substitute for backups; avoid editing the file simultaneously on multiple devices. If the file is unavailable or has changed unexpectedly, resolve the issue before writing again.

**The shared file and exported JSON backups contain plaintext two-factor secrets.** Store them only in a location you trust, restrict access to them, and never attach them to a public issue or pull request. Backups are created as new files and refuse to overwrite an existing destination.

## QR scanner helper

The QR scanner uses a small Swift helper built locally from `swift/SyncHelper.swift` by `npm run build` on macOS; no additional download is required.

## Optional file-format compatibility

The shared JSON format can also be used with the Goose 2FA uTools plugin.
