# Draft review fixes — November 17, 2026

Scope: PR #33312 review comments 4578690887 and 4578690895. The PR remains draft; this work does not request formal review, merge, deploy, or publish a Store release.

## Changes

- Deleted-version reservations are written to unique hidden temporary files and atomically hard-linked to their final name. Corrections never scan partial temporary files. Failed writes do not move the record to Trash. Existing reservations retain no-overwrite/conflict checks; temporary files are cleaned up after handled failures.
- Evidence parsing distinguishes explicit structured IDs from freshly generated plaintext IDs. Structured IDs are reserved before any content matching, including reordered and mixed entries. Plaintext matching consumes each available prior ID at most once. Duplicate explicit IDs are rejected rather than silently saved.
- Both correction and handoff review forms pass previous evidence into parsing. Earlier record bytes are never rewritten.

## Verification

- 38/38 tests pass (11 new regression cases).
- TypeScript check passes.
- Raycast lint passes: manifest, icon, metadata, ESLint and Prettier.
- Distribution build passes in the Linux cloud workspace with a temporary writable HOME for Raycast's build configuration.
- An isolated macOS checkout also passes all 38 tests, TypeScript, Raycast lint, and the distribution build against the same patch.
- New regressions were also exercised against the original packet and ledger implementations to confirm failures, including the direct legacy retention step and partial reservation publication.
- Independent read-only review found no blocking issue; its suggested direct-retention and prior-duplicate-ID coverage was added.

## Boundaries

No live user ledger was opened or modified, and no macOS Raycast UI or AI evaluation run was performed. Existing malformed final reservation files still fail closed; this patch prevents new partial publication but does not silently discard or repair old reservations. Existing ambiguous evidence in older records is not rewritten. Lawful Splat's separately distributed copy is outside this PR and was not changed.
