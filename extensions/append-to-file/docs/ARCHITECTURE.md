# Architecture

## Overview

This extension has two layers:

- Command/UI layer in `src/*.ts(x)` and `src/components`.
- Core logic layer in `src/lib`.

UI components gather user input and delegate append/search/clipboard logic to library modules.

## Command Entry Points

- `src/append-clipboard-to-file.tsx`
  - Lists clipboard history items and routes to file picker.
- `src/append-text-to-file.tsx`
  - Opens text form prefilled from clipboard offset preference.
- `src/quick-append-clipboard-to-last-appended-file.ts`
  - No-view quick append using clipboard offset `0`.
- `src/undo-last-append.ts`
  - No-view undo command.
- `src/open-last-appended-file.ts`
  - No-view open file command.

## Core Modules

- `src/lib/preferences.ts`
  - Parses and normalizes all extension preferences.
- `src/lib/clipboard.ts`
  - Reads clipboard content and history with text-only filtering.
- `src/lib/file-search.ts`
  - File discovery via Spotlight with recursive fallback, caching, and MRU sorting.
- `src/lib/file-search-filters.ts`
  - Exclude matching and depth helpers.
- `src/lib/file-policy.ts`
  - Extension allowlist enforcement.
- `src/lib/formatting.ts`
  - Append style transforms and newline/separator composition.
- `src/lib/encoding.ts`
  - Text encoding detection/decoding/encoding with UTF-16 safety handling.
- `src/lib/atomic-write.ts`
  - Atomic write implementation.
- `src/lib/cache.ts`
  - In-memory search cache and persistent MRU state.
- `src/lib/append-history.ts`
  - Last-appended tracking and safe undo metadata.
- `src/lib/append.ts`
  - End-to-end append pipeline orchestration.

## Append Pipeline

1. Validate file extension against allowlist.
2. Apply append style (`raw`, `bullet`, `quote`, `timestamp`).
3. Read existing file and detect encoding.
4. Compose final content using separator and insert position.
5. Write atomically.
6. Update MRU.
7. Record undo snapshot and last appended file metadata.

## Search Pipeline

1. Build cache key from roots/extensions/excludes/depth.
2. Return cached results if still valid (in-memory and persistent cache).
3. Try Spotlight (`mdfind`) per root in parallel.
4. Fallback to recursive scan only for roots where Spotlight failed.
5. Filter results by extension, excludes, depth, and existence.
6. Cache and sort MRU-first.

## Undo Safety Model

- Undo record stores:
  - target file path
  - whether file existed before append
  - post-append file hash
  - snapshot path for pre-append bytes (if file existed)
- Undo only proceeds if current file hash matches recorded post-append hash.
- If file was newly created by append, undo deletes file.

## State and Storage

- `LocalStorage` keys:
  - MRU list (`append-to-file.mru`)
  - last appended file
  - last append metadata record
- Support-path backup file:
  - single snapshot file used for undo source bytes

## Test Coverage

Tests live under `tests/` and currently validate:

- formatting and separator/newline behavior
- extension policy behavior
- encoding roundtrip and recovery
- atomic write cleanup and overwrite behavior
- search exclude/depth filtering helpers
