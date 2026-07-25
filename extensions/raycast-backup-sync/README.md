# Raycast Backup & Sync

Back up Raycast's local data to **your own Neon Postgres database** as versioned
archives, and restore them onto the same machine. Protects against bad updates,
accidental deletion, and disk failure — with backups you own and control.

> **This is backup, not cloud sync.** Raycast Pro already offers cross-device Cloud
> Sync. This extension exists for users who want their own off-machine, versioned
> backups in their own database, independent of a subscription.

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

## Setup: Neon connection string

This extension talks to *your* Neon Postgres database; no OAuth, no cloud project.

1. Create a free database at [neon.tech](https://neon.tech) (or pick an existing project).
2. On the project dashboard, click **Connect** and copy the **connection string**
   (starts with `postgresql://`).
3. In Raycast, open this extension's **preferences** and paste it into
   **Neon Connection String**.

That's it — the extension creates its own table (`raycast_backups`) in your database
on first use. Nothing else in your database is touched.

## Commands

| Command | What it does |
|---|---|
| **Backup Raycast to Neon** | Snapshots the data files, zips them, and inserts a row (archive + metadata) into `raycast_backups`. Applies retention. |
| **Restore Raycast from Neon** | Lists this device's backups; restores a chosen one after copying current data aside and verifying the checksum. |
| **Manage Raycast Backups** | Browse backup details and delete backups. |

## Preferences

- **Neon Connection String** — your Postgres connection string. Stored securely on this device.
- **Device Name** — identifier for this machine's backups (defaults to hostname).
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
