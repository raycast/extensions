# Secrets Manager Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Encrypted local vault: single `secrets.enc` file, AES-256-GCM, random IV per write, auth tag for tamper detection
- Encryption key is a random 256-bit key stored in the macOS Keychain, never written to the vault file
- Nested folders of arbitrary depth, plus colored tags created inline as you type
- **Manage Secrets** — browse by folder, copy, edit, retag, move, delete, filter by tag
- **Search Secrets** — search by name, tag or folder; every term must match, anywhere in the text
- **Add Secret** — save a new secret with a folder and tags
- **Export / Import** — passphrase-encrypted (scrypt, N=2¹⁷) or plain JSON; exports written with `0600` permissions
- **Daily Backup** — backup after every change plus an optional daily snapshot, with retention pruning
- Values are copied to the clipboard concealed, keeping them out of clipboard history
- Atomic vault writes and validation of imported files
