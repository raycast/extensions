# Development Result: Zhigeng Capture (Store-Ready)

## Final Architecture

A single Raycast view command (`quick-capture`) that saves notes and todos as raw Markdown drafts into an Obsidian vault's `_raw/` directory. No external CLI, Python, LLM, or API dependencies.

### Source Files

| File | Purpose |
|------|---------|
| `src/quick-capture.tsx` | Raycast form UI with draft persistence, receipt tracking, and submit handling |
| `src/raw-capture.ts` | Core capture logic: validation, fingerprinting, atomic write, retry/archived-file discovery |
| `src/preferences.ts` | Vault path resolution with `~/` support |
| `src/utils.ts` | Timestamp, filename sanitization, frontmatter builder, atomic write helper |
| `src/note-capture.ts` | Note type wrapper |
| `src/todo-capture.ts` | Todo type wrapper |

### Key Behaviors

- **Atomic writes**: Temp file in same directory → hardlink to target → unlink temp. No overwrites.
- **Stable IDs**: Each capture gets a UUID that persists across retries. Changing content after save generates a new ID.
- **Content fingerprint**: SHA-256 of `[fields, body]` prevents accidental overwrites and enables safe re-identification after archival.
- **Archived-file recovery**: If the original file was moved to `_raw/_archived/`, a retry with the same capture ID and content finds it.
- **Draft persistence**: Input is persisted to LocalStorage with a 300ms debounce, flushed on unmount. Success clears the draft and stores a receipt.
- **Receipt-based dedup**: Re-submitting an identical capture within the same session uses the cached receipt instead of writing a new file.
- **Legacy migration**: Old `meeting` type drafts are restored as notes with preserved `eventDate`.

### Protocol

Files use the `zhigeng-capture/v1` frontmatter schema. Fields include `capture_id`, `capture_type`, `capture_time` (UTC ISO), `capture_timezone` (IANA), `payload_sha256`, and type-specific fields (`scheduled`, `due`, `priority` for todos; `event_date` for legacy meetings).

## Verification

| Check | Status |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm test` (16 tests) | PASS |
| `npx ray lint` | PASS (except author placeholder) |

### Test Coverage

- **capture.test.ts** (6 tests): Note content preservation, YAML quoting, todo scheduling fields, retry with archived file, concurrent unique files, invalid ID/date/body rejection, symlink refusal.
- **form.test.tsx** (10 tests): Date restoration, legacy meeting migration, todo with dates, exit-before-debounce draft save, whitespace preservation on failure, receipt-based dedup, receipt write failure retry, rapid duplicate guard, post-save edit → new capture, late debounce suppression.

All tests use temporary vaults and mocked Raycast API; no production data is touched.

## Store Publication

See [PUBLICATION-PLAN.md](PUBLICATION-PLAN.md) for the current publication checklist and status.