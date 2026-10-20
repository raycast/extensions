# Rename

Rename files and folders in a batch, directly from Raycast.

## Commands

| Command                                                                                                                                      | Acts on                 |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Rename File(s)** — rename the selected files in a batch.                                                                                   | Files                   |
| **Replace in File Names** — replace characters in the names of the selected files.                                                           | Files                   |
| **Rename Folder(s)** — rename the selected folders in a batch.                                                                               | Folders                 |
| **Replace in Folder Names** — replace characters in the names of the selected folders.                                                       | Folders                 |
| **Advanced Batch Rename** — rename using a rule-based engine that chains find & replace, case transforms, prefixes, suffixes, and numbering. | Your choice — see below |
| **Rename History** — view recent rename operations and undo them.                                                                            | —                       |

## One command, one target type

Each rename command targets exactly one kind of Finder item, so a batch never touches something you did not mean to rename.

- **Rename File(s)** and **Replace in File Names** (previously *Replace File(s) Characters*) act on **files only**. In a mixed selection they rename just the files and leave every folder alone; a selection holding no files says so rather than renaming anything.
- **Rename Folder(s)** and **Replace in Folder Names** act on **folders only**, symmetrically — mixed selections rename just the folders, and every message names folders rather than files.
- macOS **packages** (app bundles, `.pages`/`.key` documents, and similar) are directories on disk, so they count as **folders** here even though Finder shows them as files.

> **Changed behaviour:** the file commands used to rename whatever was selected, folders included. They no longer do. To rename folders, use **Rename Folder(s)** or **Replace in Folder Names**; to rename files and folders together in one pass, use **Advanced Batch Rename** with **Apply to** set to _Files & Folders_.

## Advanced Batch Rename scope

**Advanced Batch Rename** carries an **Apply to** dropdown in its search bar with three values:

- **Files** (default) — only the files in the selection.
- **Folders** — only the folders.
- **Files & Folders** — everything selected.

The preview list is the working set: it shows exactly what will be renamed, and updates as you change the scope. Toasts and the history entry follow the scope too — _N files_, _N folders_, or _N items_. If the current scope matches nothing in the selection, the rename is blocked with a message instead of quietly doing nothing.

## Rename History

Every command records successful renames to a local history (the 25 most recent operations) and opens **Rename History** after a successful batch, so you can review — or undo — what just happened. Open it any time to:

- Browse recent rename operations with their timestamps.
- Inspect the full old → new name mapping of an operation, grouped by status (renamed, undone, could not undo).
- **Undo an operation** — or roll back several at once by picking the state to return to. Undoing a batch restores the original filenames.
- **Undo a single file** from an operation's detail view, leaving the rest of the batch renamed.

Undo is careful about files that changed since the rename: a file that has been moved or deleted, replaced by a different file, or whose original name is taken again, is skipped rather than failing the whole batch — it is marked with the reason and can be retried once the conflict is resolved. Undo verifies the file's identity (not just its path), so it never moves a file the rename didn't produce.

History is stored locally in Raycast and never leaves your machine.
