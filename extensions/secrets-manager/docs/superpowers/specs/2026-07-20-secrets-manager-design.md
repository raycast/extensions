# Secrets Manager — Raycast Extension Design

**Date:** 2026-07-20
**Status:** Approved design, pending implementation plan

## Goal

A Raycast extension to store secrets (key → value) locally, encrypted at rest.
Secrets are decrypted only when retrieved inside Raycast. Organize with nested
folders and tags. Support export/import and automatic backups.

## Non-goals

- Cross-machine sync (backups/export cover portability manually).
- Windows support (Keychain is macOS-only; `platforms` reduced to macOS).
- Sharing secrets between users.

## Platform

macOS only. Remove `Windows` from `platforms` in `package.json`.

## Architecture

```
Raycast commands (view / no-view)
        │
        ▼
  SecretsStore (core CRUD + tag/folder + import/export + backup)
        │
        ├──► Crypto (AES-256-GCM)
        │        │
        │        ▼
        │    KeyStore (macOS Keychain via `security` CLI)
        │
        ▼
  secrets.enc  (single encrypted JSON blob in environment.supportPath)
```

Four layers, each independently testable:

### KeyStore
- Get-or-create a random 256-bit data key stored in macOS Keychain.
- Backend: `security` CLI (`add-generic-password` / `find-generic-password`),
  service = `raycast-secrets-manager`, account = `data-key`.
- Key generated (`crypto.randomBytes(32)`) on first run, stored base64.
- No password typed by the user; unlock authority = macOS login session.
- Interface: `getKey(): Promise<Buffer>`, `hasKey(): Promise<boolean>`.

### Crypto
- `encrypt(plaintext: Buffer, key: Buffer) → { iv, tag, data }` (all base64).
- `decrypt({ iv, tag, data }, key) → Buffer`, throws on auth-tag mismatch.
- AES-256-GCM, random 12-byte IV per write, 16-byte GCM auth tag.
- Auth tag provides tamper detection (flip a byte → decrypt throws).

### SecretsStore
- Single source of truth. Loads/saves the whole store as one encrypted blob
  (store is small → re-encrypt entire blob on each write).
- Responsibilities: load, save, CRUD, tag ops, folder ops, import, export,
  backup.
- Uses KeyStore + Crypto. Consumers never touch crypto or files directly.

### Commands
- Thin UI over SecretsStore. No business logic in command files.

## Data model

```ts
type Secret = {
  id: string;          // uuid
  name: string;
  value: string;
  folder: string[];    // ["work","dev"] — arbitrary depth; [] = root
  tags: string[];      // ["prod","aws"]
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms
};

type Store = {
  version: 1;
  secrets: Secret[];
  folders: string[][]; // explicit folder paths, so EMPTY folders persist
};
```

- Folders are nested to arbitrary depth via the `folder` path array.
- `folders` persists explicitly created but still-empty folders (e.g. create
  `work/dev` before adding secrets). The visible folder tree = union of
  `folders` and every `secret.folder` prefix.

## Storage

- Local **file**, not a DB. One file: `secrets.enc`.
- Location: `environment.supportPath` (per-extension Raycast dir), e.g.
  `~/Library/Application Support/com.raycast.macos/extensions/secrets-manager/secrets.enc`.
- On-disk format: `{ v: 1, iv, tag, data }` (base64), the whole `Store`
  JSON-serialized then AES-256-GCM encrypted.
- Read path: read file → decrypt → parse → in-memory `Store`.
- Write path: serialize → encrypt whole store → overwrite file (atomic:
  write temp then rename).
- The encryption key lives in Keychain, never in the file. The file alone is
  useless without the Keychain key.

### Performance
Whole-blob encrypt/decrypt is fine to thousands of secrets (AES-GCM ~GB/s;
JSON parse dominates). ~10k × 1KB ≈ 10MB ≈ 20–40ms. Sharding is deferred
(YAGNI) unless values hold large blobs and it measurably hurts.

## Commands

1. **Manage Secrets** (view / List) — the hub.
   - Root: folders + root-level secrets. Entering a folder pushes a nested
     `List`. Search filters by name + tags. Tag filter dropdown in the search
     bar accessory.
   - Per-secret actions: Copy value (default ⏎), Reveal value, Edit,
     Delete (with confirm), Change tags, Move folder.
   - Export and Import reachable as actions here as well.

2. **Add Secret** (view / Form) — fields: name, value, folder (path text like
   `work/dev`), tags (comma-separated). Writes via SecretsStore.

3. **Export** (no-view) — user picks:
   - **Encrypted** (default): passphrase (typed at export) → `scrypt` →
     AES-256-GCM blob with embedded random salt. Portable + safe.
   - **Plain JSON**: readable names/values/tags/folders. Shows a loud
     confirmation warning before writing. Writes to a file, reports the path.

4. **Import** (no-view) — detect encrypted vs plain by shape. Encrypted prompts
   for passphrase. Merge into store; on name+folder conflict, offer keep-both
   or overwrite.

## Backups

Both mechanisms, all toggled via preferences. Backups are copies of the
encrypted `.enc` (still Keychain-protected, safe to keep around).

1. **Backup-on-write** — after each successful save, write a timestamped copy
   `secrets-<ISO-ts>.enc` into the backups dir; prune to the last N.
2. **Daily scheduled** — a background no-view command with `interval: "1d"` in
   `package.json` snapshots the file once per day.

### Preferences
- `Enable backups` (bool, default true)
- `Backup dir` (dir, default `supportPath/backups`)
- `Retention count` (number, default 10)
- `Daily scheduled backup` (bool, default true)

## Error handling

- Keychain unavailable / key missing on read → clear error, offer to
  initialize (first-run) rather than crash.
- Decrypt failure (tampered/corrupt file) → surface the auth-tag error, do not
  overwrite; suggest restoring from a backup.
- Atomic writes (temp + rename) so a crash mid-write can't corrupt `secrets.enc`.
- Import passphrase wrong → decrypt throws → friendly "wrong passphrase".

## Testing

- **Crypto**: round-trip encrypt→decrypt; tamper detection (flip a tag byte →
  throws); wrong-key → throws.
- **SecretsStore**: CRUD, tag ops, folder ops (incl. empty-folder persistence),
  import merge/conflict, backup rotation/retention — against a temp file with a
  mock KeyStore.
- **KeyStore**: get-or-create against real Keychain, behind a flag (side
  effects on the dev machine's Keychain).
- **Export/Import**: encrypted round-trip with passphrase; plain JSON
  round-trip.

## File layout (proposed)

```
src/
  lib/
    keystore.ts      // Keychain via `security`
    crypto.ts        // AES-256-GCM
    store.ts         // SecretsStore
    backup.ts        // backup + retention
    types.ts         // Secret, Store
  manage-secrets.tsx // List hub
  add-secret.tsx     // Form
  export-secrets.tsx // no-view
  import-secrets.tsx // no-view
  daily-backup.ts    // no-view, interval: 1d
```
