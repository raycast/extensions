# ADR-0004: Local-First Library Storage

- Status: Accepted
- Date: 2026-09-15

## Context

Users import private books that must never leave the machine unless they
explicitly share them. Books can be large, while Raycast `LocalStorage` is
designed for small values.

## Decision

Store books as plain files under `environment.supportPath`:

```text
library/
  <bookId>/
    manifest.json      # schemaVersion, metadata, visibility, chapter list
    progress.json      # reading position, percent, bookmarks
    chapters/
      0001.md
      0002.md
```

- `bookId` is a random UUID.
- `visibility` defaults to `private`. Private books are never uploaded.
- The library listing scans `library/*/manifest.json`; there is no separate
  index to drift out of sync.
- Every manifest is validated when read (`parseManifest`); invalid books are
  reported, not silently dropped.
- Writes are atomic: a new book is written to a temporary directory and
  renamed into place; JSON files are written to a temp file and renamed.
- Only `lastOpenedBookId` lives in `LocalStorage`.

## Consequences

- Deleting a book removes its progress and bookmarks with it.
- The folder layout can later be synced to a user's private GitHub repository
  or gist without a format change.
- Scanning is linear in the number of books; fine for hundreds of books. An
  index file can be added later if needed.

## Alternatives Considered

- **LocalStorage for content** — not meant for large payloads. Rejected.
- **SQLite** — adds a native or WASM dependency for little gain at this scale.
  Rejected for MVP.
