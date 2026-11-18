# Goose 2FA

Shares one vault file with the Goose 2FA uTools plugin, including account IDs, groups, trash, and HOTP counters.

A standalone Raycast extension for managing local TOTP and HOTP accounts. Create accounts from pasted Base32 secrets or screenshot/image QR codes, review their details before saving, then search and copy or paste generated codes from **Codes**. First-time users see setup shortcuts; afterward, use the action panel to add an account or scan a screenshot/image.

Configure Return behavior in Raycast extension preferences. The interface is in English; account names may contain Chinese text. Data sources and JSON backups are managed under **Settings & Data** in Raycast.

## Export an account to another authenticator

Select an account in **Codes** or **Settings & Data**, then choose **Export Account** from the action panel. The export view displays a locally generated QR code for a phone authenticator to scan. **Copy Setup Link** copies the same `otpauth://` URI; **Copy Secret** copies the Base32 key for manual entry. Use **Show Setup Text** to view either value as text. The edit form also offers **Export Saved Account**, which uses the latest saved account, not unsaved edits.

The URI preserves the account's type, algorithm, digits, and TOTP period or current HOTP counter, following the [Key URI format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format). The receiving authenticator must support those parameters. Colons within names and issuers are exported as full-width colons to avoid the format's reserved separator; stored names remain unchanged. Showing or copying an export does not advance the HOTP counter. If an account's label is too long for a QR code, the complete setup link and secret remain available to copy.

QR codes are generated in memory without network requests or image files. Copied setup links and secrets use Raycast's confidential clipboard option to exclude them from Raycast Clipboard History. **Both contain the account's two-factor secret.**

## Optional shared data source

Accounts are stored locally in Raycast by default. To use a shared data source, select an existing JSON file in the **Data Source File** preference, or open **Codes → Settings & Data** to create one in a folder you choose. You can select the same iCloud Drive file in Goose 2FA on another Mac. iCloud file synchronization is not instantaneous or a substitute for backups; avoid editing the file simultaneously on multiple devices. If the file is unavailable or has changed unexpectedly, resolve the issue before writing again.

**The shared file and exported JSON backups contain plaintext two-factor secrets.** Store them only in a location you trust, restrict access to them, and never attach them to a public issue or pull request. Backups are created as new files and refuse to overwrite an existing destination.

## QR scanner helper

Screenshot scanning hides Raycast before opening the system capture tool, then automatically reopens Goose 2FA. A single new account opens a prefilled creation form; multiple accounts open a results list so you can choose one to review. Cancelling capture returns to Codes, and an unrecognized image shows the empty scan result. No change to Raycast's global "Pop to Root Search" setting is needed.

Both pasted secrets and scanned QR codes use an account form before saving. Review the name, issuer, notes, and TOTP/HOTP settings there. Scanning or opening the form does not create an account; use **Save Account** to add it.

The QR scanner uses macOS Vision through a bundled Swift helper.
