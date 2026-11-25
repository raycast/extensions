# Safay

Search the accounts in [Safay](https://github.com/gicek/safay/releases/latest), a two-factor authenticator for macOS, and copy a code without
opening it.

## Setup

1. Install Safay and set up your vault.
2. In Safay, open **Settings → Advanced** and turn on **Launcher Access**.
3. Run **Search Accounts**. The first time, macOS asks whether Raycast may control Safay: choose **Allow**. If you
   declined, turn it on in **System Settings → Privacy & Security → Automation → Raycast → Safay**.

Optional: give the command the alias `sf` (Raycast **Settings → Extensions → Safay → Search Accounts**).

## Security

- The extension talks to Safay only through Safay's AppleScript commands, which macOS lets an app use only after you
  allow it.
- Searching returns service names and masked account names (`al***@example.com`): never a secret or a code.
- Every copy asks you to prove it is you, in Safay: Touch ID, or your master password in Safay's window. Safay puts the
  code on the clipboard (kept out of clipboard history, cleared when it expires) and shows a notice. The code is never
  passed back to the extension.
- The extension keeps no account list, stores nothing, and makes no network requests.

Search works while Safay is locked, once you have unlocked it after it started.
