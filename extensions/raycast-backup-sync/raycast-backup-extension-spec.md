---
title: Raycast Backup & Sync Extension - Technical Specification
version: 2.0
date: 2026-06-30
status: Revised after on-disk verification — Ready for Scoping
supersedes: v1.0 (assumed a JSON config model that does not exist)
---

# Raycast Backup & Sync Extension

## ⚠️ Read this first: what changed from v1.0

v1.0 of this spec was built on an **imagined storage model** — discrete JSON files
(`preferences.json`, `hotkeys.json`, `snippets.json`, …) under `~/.config/raycast/`.

**None of those files exist.** Verified on a real macOS install (2026-06-30):

- `~/.config/raycast/` holds only `extensions/` (local dev extension builds) and an
  empty `ai/` directory. No settings files.
- The user's actual data — snippets, quicklinks, hotkeys, aliases, notes, AI chats,
  clipboard history — lives in **encrypted SQLite databases** at
  `~/Library/Application Support/com.raycast.macos/`:
  - `raycast-enc.sqlite` (~15 MB) — main store
  - `raycast-activities-enc.sqlite` (~7 MB) — clipboard history / activities
  - `raycast-emoji.sqlite` (~0.5 MB)
  - each with companion `-wal` and `-shm` files
- The `-enc` databases are **encrypted** (no `SQLite format 3` header; `sqlite3`
  reports `file is not a database`). The decryption key lives in the **macOS login
  Keychain** (service `"Raycast"`).
- `~/Library/Preferences/com.raycast.macos.plist` (~66 KB, 107 keys) holds only
  window positions, migration flags, and onboarding state — **not** user content.

**Consequences for the design:**

1. There is no JSON to collect. The entire v1.0 "config collector" layer is deleted.
2. Backups are **opaque encrypted blobs**, copied file-for-file. They cannot be
   parsed, diffed, field-merged, or selectively restored.
3. The decryption key does **not** travel with the files. A blob restored onto a
   *different* machine (different Keychain key) is **not guaranteed to open**.
   Cross-device restore is therefore **unverified and out of MVP scope** — see §7.
4. Raycast Pro already ships **Cloud Sync** that does cross-device settings sync
   natively. This extension's defensible value is *local, user-controlled, versioned
   backups to your own Google Drive* — not re-implementing sync. See §1.

---

## Executive Summary

Build a Raycast extension (macOS only) that backs up Raycast's on-disk data
directory to Google Drive as a versioned, compressed archive, and restores it onto
**the same machine**. This protects against accidental data loss, bad updates, and
local disk failure, with backups the user owns and controls.

**Scope:** Same-machine backup + restore + version history
**Platform:** macOS only (see §7 for why Windows/Linux are out)
**Dependencies:** Raycast, Google Drive API, TypeScript, `archiver`
**Estimated Effort:** 4-6 days (reduced — no schema layer to build)

---

## 1. Product Overview

### Problem Statement
Users can lose Raycast data when:
- A Raycast or macOS update corrupts the local store
- They accidentally delete snippets / quicklinks / notes
- A local disk fails and they have no off-machine copy

### What Raycast already does (and why this still has value)
- **Raycast Pro Cloud Sync** syncs settings across devices automatically. If the user
  has Pro and only wants multi-device sync, they should use that.
- This extension is for users who want **their own off-machine, versioned backups**
  in **their own Google Drive**, independent of a Raycast subscription, with a visible
  history they can restore from a point in time. It is *backup*, not *sync*.

### Solution
A Raycast extension that:
1. **Backs up** the Raycast data directory to Google Drive as a timestamped archive
2. **Restores** a chosen archive back onto the same machine
3. **Manages** version history (list, delete, retention)

> Cross-device migration and live sync are explicitly **not** promised by the MVP.
> See §7 Known Limitations.

### User Flows

#### Flow 1: Backup
```
User runs "Backup Raycast to Google Drive"
  ↓
Extension warns if Raycast is running (WAL not checkpointed) and offers to proceed
  ↓
Extension copies the data files to a temp dir, zips them
  ↓
User authorizes Google Account (OAuth, first run only)
  ↓
Extension uploads raycast-backup-<timestamp>.zip to /Raycast-Backups/<device>/
  ↓
"✅ Backup complete (28 MB) — 5 versions kept"
```

#### Flow 2: Restore (same machine)
```
User runs "Restore Raycast from Google Drive"
  ↓
Extension lists archives for THIS device (timestamps + sizes)
  ↓
User selects a version
  ↓
Extension warns: "Quit Raycast before restoring" + confirms overwrite
  ↓
Extension downloads + unzips, backs up the CURRENT files first (safety copy),
  then overwrites the data directory
  ↓
"✅ Restored. Quit and reopen Raycast to load the restored data."
```

#### Flow 3 (REMOVED): "Sync across devices"
v1.0's timestamp-compare pull/push sync is **removed**. It cannot work against an
opaque encrypted blob whose key is machine-bound. Cross-device is handled (if at all)
as an experimental, clearly-labeled feature post-MVP — see §7.

---

## 2. Technical Architecture

### System Diagram
```
┌──────────────────────────────────────────────────┐
│     Raycast Extension (TypeScript + React)       │
├──────────────────────────────────────────────────┤
│  Commands:                                       │
│  • backup-to-drive                               │
│  • restore-from-drive                            │
│  • manage-backups                                │
└──────────────────┬───────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼─────────┐     ┌─────▼────────┐
   │ Raycast data │     │ Google Drive │
   │ dir (opaque) │────▶│ OAuth + API  │
   └────┬─────────┘     └──────────────┘
        │
   ┌────▼──────────────────────────────────────────────┐
   │ ~/Library/Application Support/com.raycast.macos/   │
   │   raycast-enc.sqlite            (+ -wal, -shm)     │  ← ENCRYPTED
   │   raycast-activities-enc.sqlite (+ -wal, -shm)     │  ← ENCRYPTED
   │   raycast-emoji.sqlite          (+ -wal, -shm)     │
   │ ~/Library/Preferences/com.raycast.macos.plist      │  ← window/UI state
   │                                                    │
   │ Decryption key: macOS login Keychain svc "Raycast" │  ← NOT backed up
   └────────────────────────────────────────────────────┘
```

### What we back up (allowlist) vs. exclude
**Include:**
- `raycast-enc.sqlite` + `-wal` + `-shm`
- `raycast-activities-enc.sqlite` + `-wal` + `-shm`
- `raycast-emoji.sqlite` + `-wal` + `-shm`
- `~/Library/Preferences/com.raycast.macos.plist`

**Exclude** (caches / telemetry / regenerable, ~190 MB of the 216 MB total dir):
- `posthog.*` (telemetry queue)
- `NodeJS/`, `RaycastWrapped/`, WebKit/HTTPStorages caches
- `extensions/` build artifacts under `~/.config/raycast/`

**Do NOT attempt to back up** the Keychain decryption key. Exporting Keychain items
programmatically triggers a user-facing security prompt and the key is useless on
another machine anyway. Document the cross-device limitation instead.

### Data Flow
```
Backup:  [quit/checkpoint] → copy allowlisted files → zip → upload → Drive
Restore: Drive → download → unzip → safety-copy current → overwrite → prompt restart
```

### The WAL / consistency problem (must handle)
SQLite uses write-ahead logging. When Raycast is **running**, recent writes live in
`-wal` and the main `.sqlite` is stale. Verified: Raycast was running and the `-wal`
files were 4-5 MB (non-trivial uncommitted state).

Backup MUST capture a **consistent snapshot**. Options, in order of preference:
1. **Quit Raycast** before copy (cleanest — forces a checkpoint). Detect via `pgrep`,
   prompt the user, optionally offer to quit it.
2. If proceeding while running: copy `.sqlite` **and** `-wal` **and** `-shm` together,
   atomically as a set. Never copy the `.sqlite` alone.
Restore has the inverse requirement: Raycast must be **quit** so it doesn't hold the
DB open or overwrite the restored files on exit.

---

## 3. Data Model

### Google Drive Folder Structure
```
My Drive/
└── Raycast-Backups/
    └── <deviceName>/                       (e.g. "MacBook-Pro-2024")
        ├── raycast-backup-2026-06-30T14-32-15Z.zip
        ├── raycast-backup-2026-06-30T14-32-15Z.meta.json
        └── raycast-backup-2026-06-29T10-15-22Z.zip
```

### Archive contents (`raycast-backup-<ts>.zip`)
Opaque file copies — no schema, no transformation:
```
raycast-backup-<ts>.zip
├── Application Support/com.raycast.macos/raycast-enc.sqlite
├── Application Support/com.raycast.macos/raycast-enc.sqlite-wal
├── Application Support/com.raycast.macos/raycast-enc.sqlite-shm
├── Application Support/com.raycast.macos/raycast-activities-enc.sqlite(+wal/shm)
├── Application Support/com.raycast.macos/raycast-emoji.sqlite(+wal/shm)
└── Preferences/com.raycast.macos.plist
```

### `*.meta.json` (the ONLY thing we generate)
This is the only structured data we can honestly produce — we cannot read inside the
encrypted DBs, so there are no snippet counts, hotkey lists, etc.
```json
{
  "backupId": "uuid-v4",
  "schemaVersion": "2.0",
  "deviceName": "MacBook-Pro-2024",
  "deviceId": "stable-per-machine-id",
  "raycastVersionAtBackup": "1.85.0",
  "macosVersion": "15.5",
  "timestamp": "2026-06-30T14:32:15Z",
  "raycastWasRunning": true,
  "files": [
    { "path": "Application Support/.../raycast-enc.sqlite", "bytes": 16031744 }
  ],
  "totalBytes": 31457280,
  "zipBytes": 9123456,
  "sha256": "hash-of-the-zip",
  "encryptedDbsIncluded": true,
  "keychainKeyIncluded": false,
  "restoreNote": "Encrypted DBs require the original machine's Keychain key to open."
}
```

---

## 4. Implementation Roadmap

### Phase 1: Core Infrastructure (Days 1-2)
- [ ] Scaffold extension with `create-raycast-app` (macOS only)
- [ ] Deps: `@raycast/api`, `googleapis`, `archiver`, `uuid`
- [ ] Resolve the real data paths (see Appendix); validate they exist and are readable
- [ ] Google Drive OAuth (PKCE) using `@raycast/api`'s `OAuth` helpers — store the
      refresh token in `LocalStorage`/secure storage. Scope: `drive.file`.
- [ ] Detect whether Raycast is running (`pgrep -x Raycast`)

**Deliverable:** OAuth working; data dir located; running-state detection.

### Phase 2: Backup (Days 2-3)
```typescript
// src/utils/paths.ts
import * as os from "os";
import * as path from "path";

export function getRaycastPaths() {
  const home = os.homedir();
  const appSupport = path.join(home, "Library", "Application Support", "com.raycast.macos");
  return {
    appSupport,
    files: [
      "raycast-enc.sqlite", "raycast-enc.sqlite-wal", "raycast-enc.sqlite-shm",
      "raycast-activities-enc.sqlite", "raycast-activities-enc.sqlite-wal", "raycast-activities-enc.sqlite-shm",
      "raycast-emoji.sqlite", "raycast-emoji.sqlite-wal", "raycast-emoji.sqlite-shm",
    ].map((f) => path.join(appSupport, f)),
    plist: path.join(home, "Library", "Preferences", "com.raycast.macos.plist"),
  };
}
```
- [ ] `createArchive()` — copy allowlisted files (skip missing `-wal`/`-shm`
      gracefully — they don't always exist), zip with `archiver`
- [ ] Guard: if Raycast running, warn + offer to quit (`osascript -e 'quit app "Raycast"'`)
- [ ] Compute sha256, build `*.meta.json`
- [ ] Upload zip + meta to `/Raycast-Backups/<device>/`
- [ ] Apply retention (`keepBackupCount`)

**Deliverable:** One-command consistent backup to Drive.

### Phase 3: Restore (Days 3-4)
- [ ] List archives for this device from Drive (read `*.meta.json`)
- [ ] `restore(archiveId)`:
  - [ ] **Require Raycast quit** (refuse / offer to quit if running)
  - [ ] Download + verify sha256
  - [ ] **Safety copy** current files to a local `pre-restore-<ts>/` dir first
  - [ ] Unzip and overwrite into the data dir
  - [ ] Prompt: "Reopen Raycast"
- [ ] Surface clearly if the archive came from a different `deviceId` (key mismatch
      risk) — block by default, allow only behind an "I understand" confirmation

**Deliverable:** Same-machine restore with a safety net.

### Phase 4: UI & Management (Days 4-5)
- [ ] `backup-to-drive` (HUD progress, size, retention result)
- [ ] `restore-from-drive` (List of versions, confirm dialog)
- [ ] `manage-backups` (delete, view meta, set retention)
- [ ] Preferences: `keepBackupCount`, `warnIfRunning`, `googleAccount`

### Phase 5: Testing & Polish (Days 5-6)
- [ ] Backup→restore round trip on the **same** machine; confirm Raycast opens and
      data is intact (the real acceptance test)
- [ ] WAL handling: backup while running vs. quit; verify restored DB is consistent
- [ ] Missing `-wal`/`-shm` files; first-run OAuth; token refresh; offline; Drive 403/429
- [ ] Retention correctness; corrupted-zip rejection via sha256
- [ ] README documenting the encryption / cross-device limitation prominently

---

## 5. Technical Specifications

### Dependencies
```json
{
  "dependencies": {
    "@raycast/api": "^1.85.0",
    "googleapis": "^126.0.0",
    "archiver": "^6.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```
> Removed vs v1.0: `axios` (unused), `@testing-library/react` (commands are mostly
> imperative). `dotenv` only if testing OAuth outside Raycast.

### Real Config Paths (verified 2026-06-30, macOS)
| Item | Path |
|------|------|
| Data dir | `~/Library/Application Support/com.raycast.macos/` |
| Main DB (encrypted) | `…/raycast-enc.sqlite` (+ `-wal`, `-shm`) |
| Activities DB (encrypted) | `…/raycast-activities-enc.sqlite` (+ `-wal`, `-shm`) |
| Emoji DB | `…/raycast-emoji.sqlite` (+ `-wal`, `-shm`) |
| UI prefs | `~/Library/Preferences/com.raycast.macos.plist` |
| Decryption key | macOS login Keychain, service `"Raycast"` (NOT backed up) |

### Sizes (measured)
- Full data dir: **216 MB** (mostly caches/telemetry — excluded)
- Backup payload (allowlisted files): **~30 MB** uncompressed
- Compressed zip: **~8-10 MB** (encrypted DBs compress poorly)

### Rate Limits
- Drive API: 1000 req / 100s per user. A backup is a handful of calls. Add
  exponential backoff for 429/5xx.

---

## 6. Success Criteria

### MVP (Must Have)
- [ ] Produce a **consistent** zip of the real Raycast data files
- [ ] Upload to user's Google Drive via OAuth (`drive.file` scope)
- [ ] List backup versions per device with timestamp + size
- [ ] Restore a chosen version onto the **same machine**, with a pre-restore safety copy
- [ ] Handle Raycast-running state on both backup and restore
- [ ] Honest README about encryption + same-machine limitation

### Out of MVP (explicitly)
- Cross-device restore (key-mismatch risk — experimental at best, see §7)
- Field-level / selective restore (impossible against encrypted opaque DBs)
- Live sync / merge (removed — replaced by versioned backup)
- Windows / Linux (Raycast is macOS-only)

---

## 7. Known Limitations & Workarounds

### Limitation 1: Databases are encrypted; key is in the Keychain
**Issue:** `raycast-enc.sqlite` / `raycast-activities-enc.sqlite` are encrypted; the
key lives in the login Keychain. We back up the ciphertext, not the key.
**Workaround:** Restore is supported on the **same machine** (same Keychain), which is
the dominant real use case (bad update, accidental deletion, point-in-time rollback).

### Limitation 2: Cross-device restore is not guaranteed
**Issue:** A backup restored on a different Mac may fail to decrypt because that Mac's
Keychain key differs.
**Workaround:** Out of MVP. If pursued later, it must be prototyped and verified
end-to-end before being promised — and gated behind an explicit warning. Users who
want device migration should use **Raycast Pro Cloud Sync**.

### Limitation 3: SQLite consistency (WAL)
**Issue:** Copying a live DB without its `-wal`/`-shm` yields a stale/corrupt restore.
**Workaround:** Prefer quitting Raycast (forces checkpoint); otherwise copy the
`.sqlite`+`-wal`+`-shm` set together. Restore requires Raycast quit.

### Limitation 4: We cannot show "what's inside" a backup
**Issue:** No snippet/hotkey counts — the DBs are opaque to us.
**Workaround:** Metadata is limited to file sizes, timestamps, versions, and checksum.

### Limitation 5: Backup includes clipboard history (potentially sensitive)
**Issue:** `raycast-activities-enc.sqlite` is clipboard history; it may contain
secrets the user pasted.
**Workaround:** It's already encrypted at rest in the zip's source, but make backing
up activities a **preference (default on, clearly labeled)**, and recommend the user
keep backups in a private Drive folder.

---

## 8. Security & Privacy
- OAuth scope `drive.file` only — app sees only files it created.
- Backups stored solely in the user's `/Raycast-Backups/` Drive folder.
- Refresh token in Raycast secure storage.
- Source DBs are already encrypted by Raycast; the zip inherits that. We do **not**
  add or manage our own encryption in MVP (the data is already ciphertext).
- We never export or transmit the Keychain key.

---

## 9. Open Questions
1. Default for backing up clipboard-history DB — on or off?
2. Retention default — keep last 5? 10? size-capped?
3. Should "quit Raycast for a clean backup" be required or just recommended?
4. Is cross-device restore worth a research spike, or do we hard-cut it and point
   users to Raycast Cloud Sync?
5. Do we verify a restore by relaunching Raycast headlessly, or rely on the user?

---

## 10. Verification Log (how the v2 facts were established)
On 2026-06-30, on the target macOS machine:
- `ls ~/.config/raycast/` → only `extensions/`, `ai/`; **no JSON config files**.
- `ls ~/Library/Application Support/com.raycast.macos/` → the `*-enc.sqlite` DBs
  + `-wal`/`-shm`, plus posthog/cache dirs.
- `head -c 16 raycast-enc.sqlite | xxd` → not the `SQLite format 3` magic;
  `sqlite3 raycast-enc.sqlite .tables` → `Error: file is not a database` (**encrypted**).
- `security dump-keychain` → three `"Raycast"` service entries (the key material).
- `plutil` on the plist → 107 keys, all window/UI/migration/onboarding state.
- `du -sh` → 216 MB total dir; ~30 MB allowlisted payload; Raycast process running
  with 4-5 MB live `-wal` files (confirms the consistency concern is real).

---

**Document Version:** 2.0
**Last Updated:** 2026-06-30
**Status:** Revised after on-disk verification — Ready for Scoping
