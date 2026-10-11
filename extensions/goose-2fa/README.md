# Goose 2FA

Shares one vault file with the Goose 2FA uTools plugin, including account IDs, groups, trash, and HOTP counters.

A standalone Raycast extension for managing local TOTP and HOTP accounts. Create accounts from pasted Base32 secrets or screenshot/image QR codes, review their details before saving, then search and copy or paste generated codes from **Codes**. First-time users see setup shortcuts; afterward, use the action panel to add an account or scan a screenshot/image.

Configure Return behavior in Raycast extension preferences. The interface is in English; account names may contain Chinese text. Data sources and JSON backups are managed under **Settings & Data** in Raycast.

## Optional shared data source

Accounts are stored locally in Raycast by default. To use a shared data source, select an existing JSON file in the **Data Source File** preference, or open **Codes → Settings & Data** to create one in a folder you choose. You can select the same iCloud Drive file in Goose 2FA on another Mac. iCloud file synchronization is not instantaneous or a substitute for backups; avoid editing the file simultaneously on multiple devices. If the file is unavailable or has changed unexpectedly, resolve the issue before writing again.

**The shared file and exported JSON backups contain plaintext two-factor secrets.** Store them only in a location you trust, restrict access to them, and never attach them to a public issue or pull request. Backups are created as new files and refuse to overwrite an existing destination.

## QR scanner helper

Screenshot scanning hides Raycast before opening the system capture tool, then automatically reopens Goose 2FA. A single new account opens a prefilled creation form; multiple accounts open a results list so you can choose one to review. Cancelling capture returns to Codes, and an unrecognized image shows the empty scan result. No change to Raycast's global "Pop to Root Search" setting is needed.

Both pasted secrets and scanned QR codes use an account form before saving. Review the name, issuer, notes, and TOTP/HOTP settings there. Scanning or opening the form does not create an account; use **Save Account** to add it.

The QR scanner uses macOS Vision through a Swift package. Raycast builds and bundles it automatically during `ray build` and `ray publish`.

## Optional file-format compatibility

The shared JSON format can also be used with the Goose 2FA uTools plugin.
