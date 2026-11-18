# code-saver Changelog

## [Update SQLite dependency] - 2026-11-08

- Update better-sqlite3-multiple-ciphers to 13.0.3 and use its bundled Node-API binaries across supported Node versions.
- Verify the npm archive with a pinned SHA-512 checksum before extracting the binary for Intel or Apple Silicon Macs.

## [Fix snippet transactions] - {PR_MERGE_DATE}

- Keep snippet and label changes in synchronous SQLite transactions.

## [Node 22 and Node 26 compatibility] - {PR_MERGE_DATE}

- Use matching, verified SQLite downloads with separate caches for each runtime.

## [Minor Change] - 2025-06-11
- Make sure we can download `better-sqlite3-multiple-ciphers` as needed.

## [Minor Change] - 2023-11-08
- Add encryption for sqlite data store.

## [First Version] - 2023-11-06
- Add creation for Label, Snippet and Library.
- Add broswer for Snippet.
- Add updating for Label, Snippet and Library.
- Add tldr format checking.
- Add tldr format browering.

## [Initial Version] - 2023-09-18
