# Rename

Rename files in a batch, directly from Raycast.

## Commands

- **Rename File(s)** — rename the files selected in Finder in a batch.
- **Replace File(s) Characters** — replace characters in the names of the selected files.
- **Advanced Batch Rename** — rename files using a rule-based engine that chains find & replace, case transforms, prefixes, suffixes, and numbering.
- **Rename History** — view recent rename operations and undo them.

## Rename History

Every command records successful renames to a local history (the 25 most recent operations) and opens **Rename History** after a successful batch, so you can review — or undo — what just happened. Open it any time to:

- Browse recent rename operations with their timestamps.
- Inspect the full old → new name mapping of an operation, grouped by status (renamed, undone, could not undo).
- **Undo an operation** — or roll back several at once by picking the state to return to. Undoing a batch restores the original filenames.
- **Undo a single file** from an operation's detail view, leaving the rest of the batch renamed.

Undo is careful about files that changed since the rename: a file that has been moved or deleted, replaced by a different file, or whose original name is taken again, is skipped rather than failing the whole batch — it is marked with the reason and can be retried once the conflict is resolved. Undo verifies the file's identity (not just its path), so it never moves a file the rename didn't produce.

History is stored locally in Raycast and never leaves your machine.
