<p align="center">
    <img src="./assets/command-icon.png" width="150" height="150" />
</p>

# Two-Factor Authentication Code Generator

Generate TOTP-powered 2FA login codes for any service that supports authenticator apps.

## Features

- View live codes with a countdown for the current period
- Copy a code to the clipboard, or paste it into the focused app
- Add accounts manually or from an `otpauth://` URL
- Backup and restore your accounts

## Copy vs Paste

Codes expire quickly, so pasting into the focused field is often better than copying.

- **Paste Code** inserts the code into the frontmost application (no need for ⌘V)
- **Copy Code** puts the code on the clipboard

Set which one Enter runs in extension preferences:

**Raycast Settings → Extensions → Two-Factor Authentication Code Generator → Default Action**

Choose **Paste** or **Copy**. The other action stays available as a secondary action.

## Add an account

1. Run **Generate 2FA Code**
2. Use **Add App** (⌘G) and enter the name + secret, or **Add App by URL** (⌘U) with an `otpauth://` link

## Backup and restore

- **Backup 2FA Codes** writes your accounts as `otpauth://` URLs to a text file (plain text — treat it as sensitive)
- **Restore 2FA Codes** imports accounts from a previous backup file
