# Goose 2FA

A local two-factor code manager for Raycast. Open **Codes** to search accounts, copy codes, or paste them into the previous app. Use the command's action panel to manage accounts, scan QR codes, and import or export a JSON backup.

Choose a list or grid and configure Return behavior in the extension preferences. English is the default; Simplified Chinese is optional.

## Shared data source

Select an existing JSON file in the **Data Source File** preference, or open **Codes → Settings & Data** to create one in a folder you choose. Select the same iCloud Drive file on another Mac or in the uTools plugin. iCloud file synchronization is not instantaneous or a substitute for backups; avoid editing the file simultaneously on multiple devices. If the file is unavailable or has changed unexpectedly, resolve the issue before writing again.

**The shared file and exported JSON backups contain plaintext two-factor secrets.** Store them only in a location you trust, restrict access to them, and never attach them to a public issue or pull request. Backups are created as new files and refuse to overwrite an existing destination.

The QR scanner uses a small Swift helper built locally from `swift/SyncHelper.swift` by `npm run build` on macOS; no additional download is required.
