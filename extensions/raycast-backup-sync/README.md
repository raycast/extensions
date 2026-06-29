# Raycast Backup & Sync

Back up Raycast's local data to **your own Google Drive** as versioned archives, and
restore them onto the same machine. Protects against bad updates, accidental deletion,
and disk failure — with backups you own and control.

> **This is backup, not cloud sync.** Raycast Pro already offers cross-device Cloud
> Sync. This extension exists for users who want their own off-machine, versioned
> backups in their own Drive, independent of a subscription.

## What it backs up

Raycast stores its data on macOS in encrypted SQLite databases, **not** loose JSON
files. This extension snapshots the real files:

- `~/Library/Application Support/com.raycast.macos/raycast-enc.sqlite` (+ `-wal`, `-shm`) — main store
- `…/raycast-activities-enc.sqlite` (+ `-wal`, `-shm`) — clipboard history *(optional)*
- `…/raycast-emoji.sqlite` (+ `-wal`, `-shm`)
- `~/Library/Preferences/com.raycast.macos.plist` — window / UI state

Caches and telemetry (~190 MB of the data directory) are excluded. A typical archive
is ~8–10 MB compressed.

## ⚠️ Important limitations

- **macOS only.** Raycast is a macOS app.
- **Same-machine restore.** The databases are encrypted with a key stored in this
  Mac's login Keychain. That key is **not** part of the backup (and can't usefully be).
  A backup restored on a *different* Mac may fail to decrypt — the extension warns you
  before allowing it.
- **Opaque archives.** Because the databases are encrypted, the extension can't read
  inside them — no per-snippet/hotkey listing, no field-level merge or selective
  restore. Restore is whole-archive.
- **Quit Raycast for best results.** SQLite write-ahead logging means a running
  Raycast may have uncommitted data. The extension offers to quit Raycast for a
  consistent backup, and requires it quit during restore.

## Setup: Google OAuth credentials

This extension talks to *your* Google account; you supply the OAuth credentials.

1. Open the [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. **APIs & Services → Library →** enable the **Google Drive API**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Authorized redirect URI: `https://raycast.com/redirect`
4. Copy the **Client ID** and **Client secret**.
5. In Raycast, open this extension's **preferences** and paste them into
   **Google OAuth Client ID** and **Google OAuth Client Secret**.

The extension requests only the **`drive.file`** scope, so it can see *only* the files
it creates — never the rest of your Drive.

## Commands

| Command | What it does |
|---|---|
| **Backup Raycast to Google Drive** | Snapshots the data files and uploads `raycast-backup-<timestamp>.zip` + metadata to `/Raycast-Backups/<device>/`. Applies retention. |
| **Restore Raycast from Google Drive** | Lists this device's backups; restores a chosen one after copying current data aside and verifying the checksum. |
| **Manage Raycast Backups** | Browse backup details, delete backups, disconnect the Google account. |

## Preferences

- **Device Name** — folder name for this machine's backups (defaults to hostname).
- **Backups to Keep** — retention count per device (`0` keeps all).
- **Include Clipboard History** — back up the activities database (may contain
  sensitive copied content). On by default.
- **Safety Checks** — warn / offer to quit Raycast for a consistent snapshot.

## How a restore stays safe

1. Refuses a backup from a different device unless you explicitly confirm.
2. Verifies the archive's SHA-256 against the recorded checksum before writing.
3. Copies your **current** files to a timestamped folder in the system temp dir
   *before* overwriting, so a bad restore is recoverable.
4. Requires Raycast to be quit, then prompts you to reopen it.

## Development

```sh
npm install
npm run dev        # ray develop — loads the extension into Raycast
npm run typecheck  # tsc --noEmit
npm run lint
```

## License

MIT
