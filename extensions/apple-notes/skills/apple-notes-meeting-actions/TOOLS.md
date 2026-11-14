# Existing AI tools

Read the complete manifest and all 9 files in `src/tools/` before writing the skill. Optional inputs carry `?`. These are the registered inputs, not additional tools.

| Tool | Inputs |
| --- | --- |
| [create-note](../../src/tools/create-note.ts) | `content: string`; `raw_content: string` |
| [search-notes](../../src/tools/search-notes.ts) | `searchText?: string`; `tags?: string` |
| [get-note-content](../../src/tools/get-note-content.ts) | `noteId: string` |
| [update-note](../../src/tools/update-note.ts) | `noteId: string`; `content: string` |
| [append-to-note](../../src/tools/append-to-note.ts) | `noteId: string`; `content: string` |
| [delete-note](../../src/tools/delete-note.ts) | `noteId: string`; `noteTitle?: string` |
| [restore-note](../../src/tools/restore-note.ts) | `noteId: string` |
| [move-note](../../src/tools/move-note.ts) | `noteId: string`; `folderName: string`; `accountName?: string` |
| [list-folders](../../src/tools/list-folders.ts) | None |

## Behavior and limits

- Search uses titles/snippets, orders by modification time, caps results at the maximum-query preference, then filters tags. It has no date/folder filter or cursor; tags require all matches. Modification time does not establish the meeting date.
- `get-note-content` returns AppleScript HTML. Use the search result `id`, not `UUID`, for reads and writes; `url` is for linking.
- Create takes HTML and a plain-text confirmation preview, with no destination input. It creates in the Notes default destination and returns AppleScript output without a guaranteed structured identifier. Resolve the unique created note before a requested move.
- Append reads the existing body and sets the combined HTML. Update replaces the body. Neither operation returns a structured success receipt. Read back uncertain writes before retries; neither operation should be used to claim preservation of unread rich content or attachments.
- `list-folders` returns account/folder pairs; duplicate folder names require `accountName` for `move-note`. There is no folder-creation, attachment-export, task-creation, or reminder tool.
- Delete has a destructive confirmation. Restore moves the note to account 1’s default folder, not necessarily its original folder; neither belongs in a routine meeting review.
