# Passig for Raycast

Raycast extension for **[Passig](https://passig.app)**, the zero-knowledge password manager. All cryptography runs locally on your Mac (libsodium): the Passig server only ever receives and returns encrypted blobs.

## Commands

| Command | What it does |
|---|---|
| **Search Passwords** | Fuzzy search by title, username, website and vault. Copy the password (concealed, cleared after 30 s), paste it into the frontmost app, copy the username, copy/paste the TOTP code, open the website, show details (password hidden, toggle with `⌘⇧P`), refresh from the server, lock. |
| **Save Password** | Create a login item in a writable vault (title, username, password with generator `⌘G`, URL, TOTP, notes). |
| **Import Passwords** | Import an export from Bitwarden, 1Password, LastPass, Chrome, Firefox, Safari, KeePass, Dashlane, Keeper, NordPass, Proton Pass, Enpass, RoboForm or a CSV file. Items are encrypted locally before upload. |
| **Generate Password** | Password generator with length and character sets; copy or paste. Does not require unlocking. |
| **Lock Passig** | Clears the unlocked keys and the clipboard if it still holds a copied secret. |
| **Clear Passig Clipboard** | Background command (every minute) that clears the clipboard if it still holds a secret copied at least 30 s ago. |

## Setup

You need a Passig account (create one for free at [passig.app](https://passig.app)). On first launch Raycast asks for:

- **Email** – the email of your Passig account
- **Auto-Lock (Minutes)** – how long after unlocking the master password is required again (default 15 minutes)
- **Device Name** – shown in the sessions list of your account
- **Language** – interface language (defaults to the language of your Mac)

## Development

```bash
npm install
npm run dev        # ray develop
npm run build      # ray build
npm run lint
npm test           # i18n dictionary checks
```

`src/vendor/` contains a copy of Passig's shared client libraries and is committed as-is. It is regenerated only from the Passig monorepo with `npm run vendor`; the script refuses to run (and leaves `src/vendor` untouched) when the monorepo sources are not available.

## Security model

Every Raycast command runs in a separate, short-lived Node process and Raycast does not expose the macOS Keychain to extensions. Therefore:

- **The master password is never stored.**
- **Raycast `LocalStorage`** (persistent) only holds the refresh token and the clipboard-cleanup markers (SHA-256 hashes, never the secret itself). The refresh token alone cannot decrypt anything.
- **Raycast `Cache`** holds the unlocked session snapshot (keys in base64 plus still-encrypted items) until the auto-lock time chosen in the preferences. The snapshot is bound to the configured account email and expires at the auto-lock time measured from the unlock; open views lock themselves when it expires. Use **Lock Passig** (or a 1-minute auto-lock) if you prefer a shorter window.
- **Clipboard**: passwords are copied with `concealed: true` (not stored in Raycast's clipboard history) and cleared after 30 s if still present; locking clears them immediately.
- The server never sees titles, usernames, passwords, URLs or notes.

## Limitations

- No Touch ID unlock: Raycast does not expose LocalAuthentication/Keychain to extensions.
- Existing items cannot be edited or deleted from Raycast; use the Passig apps.
