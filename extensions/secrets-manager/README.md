# Secrets Manager

Store API keys, tokens and passwords in an encrypted local file — and pull them up from Raycast in a couple of keystrokes.

Everything stays on your Mac. The vault is a single `secrets.enc` file encrypted with **AES-256-GCM**; the encryption key is a random 256-bit key kept in the **macOS Keychain** and never written to the file. No account, no sync, no network calls.

## Features

- **Encrypted at rest** — AES-256-GCM with a fresh IV per write and an auth tag that detects tampering.
- **Keychain-backed key** — unlocking is your macOS login. Nothing to type, nothing to remember.
- **Nested folders** — organize as deep as you like: `work/dev`, `work/prod`, `personal/aws`.
- **Tags** — colored, searchable, created inline as you type.
- **Fast search** — find a secret by name, tag or folder; every term has to match, anywhere in the text.
- **Copy concealed** — values are copied with `concealed: true` so they stay out of clipboard history.
- **Export / import** — move the vault between machines, passphrase-encrypted or as plain JSON.
- **Automatic backups** — a timestamped copy after every change plus an optional daily snapshot, with retention pruning.

## Commands

| Command | What it does |
| --- | --- |
| **Manage Secrets** | Browse by folder. Copy, edit, retag, move or delete a secret. Filter by tag. |
| **Search Secrets** | Flat search across everything by name, tag or folder. |
| **Add Secret** | Save a new secret with a folder and tags. |
| **Export Secrets** | Write the vault to a passphrase-encrypted file, or plain JSON. |
| **Import Secrets** | Merge a previously exported file back in. |
| **Daily Backup** | Background job; snapshots the encrypted vault once a day. |

### Handy shortcuts

- `⏎` — copy the selected secret's value
- `⌘E` — edit the secret
- `⌘⇧M` — move it to another folder
- `⌃X` — delete it (with confirmation)

## Tags

Type in the box under the Tags field and press `Enter` or `,` — the tag appears as a chip above, styled and colored. Pick existing tags from the chip field's dropdown (already-added ones are filtered out), and click a chip's `×` to remove it. New tags are saved with the secret.

Tag colors are derived from the tag name, so a tag looks the same everywhere.

## Export & import

Two formats:

- **Encrypted (recommended)** — you choose a passphrase at export time. It's run through `scrypt` (N=2¹⁷) to derive a separate key, and the file is AES-256-GCM encrypted with it. This is what makes an export portable: the vault's normal key lives in your Keychain and can't leave the machine.
- **Plain JSON** — readable by anything. Requires a confirmation, since every value lands on disk in the clear.

Exports are written to `~/Downloads` by default (or a folder you pick) with `0600` permissions, and revealed in Finder.

> **The export passphrase cannot be recovered.** It's the only thing protecting that file — not your Keychain, not your login. Lose it and the export is permanently unreadable.

## Backups

Backups are copies of the already-encrypted vault, so they're safe to keep around and useless without your Keychain.

Configure in extension preferences:

| Preference | Default | Meaning |
| --- | --- | --- |
| Enable automatic backups | on | Write a timestamped backup after each change |
| Backup folder | extension support folder | Where backups go |
| Backup retention | 10 | How many to keep before pruning the oldest |
| Daily scheduled backup | on | One background snapshot per day |

## Where things live

```
~/Library/Application Support/com.raycast.macos/extensions/secrets-manager/
  secrets.enc        # the encrypted vault
  backups/           # timestamped encrypted copies
```

Keychain item: service `raycast-secrets-manager`, account `data-key`.

> Deleting that Keychain item makes every existing secret permanently undecryptable. There is no recovery path — export first if you're migrating machines.

## Security notes

- Secret values are never written unencrypted, except when you explicitly choose a plain-JSON export.
- Vault writes are atomic (temp file + rename), so a crash mid-write can't corrupt it.
- Decryption failures surface as errors rather than silently overwriting the vault.
- Imported files are validated before they're merged, so a malformed file can't corrupt the store.

## Development

```bash
npm install
npm run dev     # run in Raycast
npm test        # unit tests (vitest)
npm run lint
npm run build
```

The Keychain integration test touches the real login Keychain and is skipped by default:

```bash
RUN_KEYCHAIN_TESTS=1 npx vitest run src/lib/keystore.test.ts
```

### Layout

```
src/
  lib/        crypto, keystore, store, backup, portable (export/import), prefs
  components/ shared form + list pieces
  *.tsx       one file per Raycast command
```

`SecretsStore` is the only thing that touches the vault file; commands stay thin.
