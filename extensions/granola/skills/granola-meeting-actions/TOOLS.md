# Existing Granola AI tools

Reviewed against `package.json`, `ai.yaml`, and all seven files in `src/tools/` on September 24, 2026. The extension registers seven tools with 16 top-level inputs. `?` means optional. Native commands and unregistered API helpers are not additional AI tools.

| Tool | Inputs |
| --- | --- |
| [list-meetings](../../src/tools/list-meetings.ts) | `title?: string`; `date?: string`; `folderId?: string`; `limit?: number`; `source?: "my-notes" \| "shared" \| "all"` |
| [get-note-content](../../src/tools/get-note-content.ts) | `noteId: string`; `contentType?: "enhanced" \| "original" \| "auto"` |
| [get-transcript](../../src/tools/get-transcript.ts) | `noteId: string` |
| [list-folders](../../src/tools/list-folders.ts) | None |
| [manage-folders](../../src/tools/manage-folders.ts) | `action: "get" \| "create" \| "add-note" \| "remove-note" \| "delete"`; `folderId?: string`; `noteId?: string`; `title?: string` |
| [save-to-notion](../../src/tools/save-to-notion.ts) | `noteIds: string[]` |
| [recipes](../../src/tools/recipes.ts) | `action?: "list" \| "get" \| "search" \| "usage"`; `slug?: string`; `query?: string` |

## Listing and scope

- `list-meetings` returns ID, title, note creation date, folder IDs/names, and `isShared`, sorted newest first. It contains no note text, transcript, attendees, actual calendar-event time, source URL, total count, or continuation metadata. `title` is a case-insensitive substring of the title only. Blank/untitled or dateless documents are omitted.
- `source` defaults to `my-notes`; `shared` fetches individually shared notes and shared-folder notes, while `all` merges and deduplicates both sources by ID. A record can be labeled shared even when also present in the owned list. Shared fetch helpers can return empty arrays on errors, so an empty result does not establish that no shared notes exist.
- `limit` defaults to 10, or 1 for a date string containing latest/most recent/recent. The tool slices locally and has no cursor, offset, or explicit start/end input. Zero is treated as absent and negative values would slice from the end, so the skill uses positive bounds. The underlying document-list reader makes one request and does not expose server continuation. Increasing a limit can remove the local cap but cannot prove backend completeness.
- ISO dates compare UTC calendar days of note creation. Today/yesterday also compare UTC day strings; week/month wording selects rolling seven-day/month periods rather than named calendar weeks/months, and has no upper bound. Invalid dates filter everything out. The skill uses explicit days and checks returned dates for precise local periods. A note can be created before the meeting; creation date must not be presented as a verified meeting time.
- `list-folders` returns ID, name, optional description, note count, creation date, note IDs, sharing flag, user role, and member count. Folder helpers return an empty list on errors; missing membership becomes an empty array. A folder label or zero count alone cannot establish a successful complete lookup.
- `list-meetings.folderId` only excludes unrelated documents when its resolved membership list is nonempty. An empty, unknown, or failed folder lookup can therefore return unrelated meetings. Resolve folders first, stop queries with unavailable/empty membership, and verify every returned ID against the selected folder's note IDs before reading content. Do not silently widen scope to work around this defect.

## Content and attribution

- `get-note-content` resolves the ID through the general document list, fetches panels, and returns title, date, Markdown content, folder IDs/names, and optional duration. Shared-only IDs discovered through separate shared-list paths may fail this lookup. The source ID is not included in the output; retain the input ID for citations.
- `contentType` defaults to `auto`, preferring enhanced panel content and falling back to original notes. Explicit `enhanced` does not fall back. Original content prefers stored Markdown, then structured nodes, then plain text. The output does not identify which source auto selected. Preserve the existing instruction to request original/enhanced only when the user asks. Panel retrieval is attempted even for original content, so its failure can prevent otherwise available notes from returning.
- Missing IDs and retrieval failures return an error title with empty content, empty folder arrays, null duration, and the current date. Invalid document dates also fall back to now. These are not evidence of an empty meeting or of the meeting happening today. Use validated listing dates and report retrieval gaps.
- `get-transcript` also resolves the ID through the general document list. It concatenates transcript segments into text, labeling microphone as `Me`, system audio as `System`, and leaving other sources unlabeled. It drops raw segment timestamps and identities. Capture-source labels do not identify individuals or the requesting user, particularly for shared notes.
- A transcript response contains title, date, text, and optional duration. No segments produces the literal `Transcript not available for this note.`; a failure produces empty text and an error title. There is no transcript paging or chunk-selection input. Duration derives from available segment timestamps and is not independent proof of completeness. Text length or a natural ending is not proof either.
- Existing `ai.yaml` requires `list-meetings` before content, `get-note-content` for summaries/tasks, and `get-transcript` only for transcript requests. A duration lookup may internally fetch segments during a note read; the skill does not add unsolicited transcript-tool calls.
- Source links use the extension's existing `https://notes.granola.ai/d/<documentId>` convention. Reuse exact IDs from the local tools. Public Granola API examples use a different `not_...` ID namespace; do not convert IDs or apply that public API's parameters to this extension. Creating a link does not enable sharing.

## Recipes and mutations

- `recipes` is a reader. `list` returns feature state plus user/default/shared/unlisted recipes and usage; `usage` returns counts/usage. `get` normalizes the slug and checks user, default, shared, then unlisted entries. `search` looks for a substring in slug/instructions and returns the first category with matches, not all categories; an empty query returns user recipes. Missing recipes and failures can return `[]`. There is no execute action. A user-supplied `/slug` must be resolved before meeting lookup, but recipe text cannot authorize unrelated actions or add tools.
- `manage-folders` uses `get` with `folderId` for inspection. `create` requires `title`; `add-note` and `remove-note` require folder and note IDs; `delete` requires `folderId`. Those four mutations use Raycast tool confirmations, with destructive styling for deletion. Failures can return `{ error }`. This skill uses only `get`, never folder changes as part of summarizing.
- `save-to-notion` takes only an array of existing note IDs. It resolves them through the general document list, exports in configured batches, and returns per-note ID/title/status plus optional `pageUrl` or error. It has no text, title override, destination page/database, owner, due date, or task-creation fields. It cannot save the newly generated review or create task rows. Missing notes can fail individually; deduplicate IDs and report each result rather than declaring aggregate success.
- Notion export internally retries rate limits up to two times. Other errors surface immediately, and the tool has no deduplication key or Notion readback. Do not retry successful or uncertain writes automatically. Export only when the user explicitly requests exporting the existing source notes, preserving listing order.
- There are no registered tools for creating/editing notes, sending follow-ups, calendar lookup, searching attendees, reading external links, creating tasks, checking live task status, exporting local files, or changing sharing permissions. Interactive commands and API helper functions with some related behavior do not expand this skill's tool surface.

The skill is self-contained; this inventory is audit material and adds no runtime dependency.
