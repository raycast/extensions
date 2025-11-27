# Great Library Command Workflows

This note captures how the Raycast commands (`Ask`, `List Files`, `Upload Files`, and `Quick Note`) plus AI tools interact with Google File Search so the next agent can reason about changes quickly.

## Shared Building Blocks
- **Preferences & Google client**: `getExtensionPreferences` exposes the `api-key` and `store-display-name` Raycast settings (`src/lib/preferences.ts`). `getGoogleClient` memoizes the Gemini SDK client using those preferences so every command reuses the same authenticated instance (`src/lib/google-client.ts`).
- **File Search store management**: `ensureFileSearchStore` lists stores and creates one only when the configured display name does not already exist (`src/lib/file-search.ts`). The module also exposes helpers for uploading (`uploadFileToStore`, `waitForUploadCompletion`), fetching, and deleting (`deleteDocumentFromStore`, `deleteAllDocumentsFromStore`) File Search documents.
- **Document cache**: Indexed documents live in Raycast `LocalStorage` behind `getDocuments`, `upsertDocuments`, and `replaceDocuments` (`src/lib/cache.ts`). All commands treat this cache as the single source for quick UI loads while syncing against Google when possible.
- **Upload helpers**: `uploadFilesToLibrary` enforces the 100 MB limit, uploads sequentially, derives MIME types, and pushes successful uploads into the cache (`src/lib/upload.ts`). `findOversizedFile` and `readFilesMetadata` keep validation logic consistent between commands and tools.
- **Ask workflow primitives**: `runAskFlow` wraps `askLibrary`, tracks the Gemini `conversation`, applies File Search grounding, and trims history to 10 messages by default (`src/lib/ask.ts`). Utilities such as `extractCitations`, `describeGroundingChunk`, and `truncate` centralize logging/formatting.
- **UI utilities**: `src/utils/ui-helpers.ts` holds shared affordances (status tags, copy actions, consistent toast handling) so the commands can stay focused on business logic.

## Quick Note Command
1. **Capture text** – `src/quick-note.ts` runs as a no-view command. It inspects the Raycast `launchContext` for `selectedText`, falls back to `getSelectedText()` from @raycast/api, and finally checks the clipboard. Launch failures prompt the user to select or copy text first.
2. **Derive title** – The command converts the first non-empty line (optionally prefixed with the source application name) into a title capped at ~80 characters, mirroring the note tool’s slug-friendly expectations.
3. **Reuse note tool** – Instead of duplicating upload logic, the command calls `src/tools/note.ts` with the derived title/content. All validation, file writing, cleanup, and upload behavior remains centralized in the shared tool implementation.
4. **Feedback** – Animated toasts report capture progress, success (with the stored note name), or validation failures. Console logs include the captured character count and resulting note metadata for troubleshooting.

**Operational notes**
- Because it uses the clipboard as a last resort, the command can still work inside apps that refuse to expose selection via the macOS Accessibility APIs.
- The command is the fastest ingestion path; it never prompts for extra metadata, so follow-up edits must happen via a List → Delete → re-upload flow if the content needs tweaks.

## Upload Files Command
1. **Form shell** – `src/upload-files-command.tsx` renders the picker-only form. It delegates all state to `useFileUpload`, so the component just wires up the submit action and helper text.
2. **Selection management** – `useFileUpload` memoizes the sorted file selection via a signature, asynchronously reads metadata, and exposes derived totals for the helper text (`src/hooks/useFileUpload.ts`).
3. **Validation & toasts** – Submitting the form triggers `uploadFiles`, which shows a toast, verifies at least one file was provided, checks the 100 MB limit via `findOversizedFile`, and falls back to fresh metadata if the current signature differs from the cached selection.
4. **Upload pipeline** – The hook forwards files to `uploadFilesToLibrary`. Progress callbacks update the toast with the active filename, uploads occur sequentially, operations are polled via `waitForUploadCompletion`, and successful uploads are cached through `upsertDocuments`.
5. **Cleanup** – On success the hook resets its internal state (clearing the picker UI), invokes any optional callbacks, and surfaces success/error toasts. Launching the command with a different `launchContext` also triggers a reset, ensuring every invocation starts fresh.

**Operational notes**
- The helper throws when MIME type detection fails; this safeguards Google File Search uploads because the SDK requires a `mimeType`.
- Since uploads are sequential, partial failures leave the cache untouched; re-running the command re-uploads the entire selection.

## List Files Command
1. **Data sources** – `src/list-files-command.tsx` depends on `useDocumentList`, which first loads cached documents for instant rendering, then optionally auto-refreshes from Google (`src/hooks/useDocumentList.ts`).
2. **Refreshing** – `refresh` shows a toast while `fetchDocumentsFromStore` enumerates File Search documents through the Gemini client. Success replaces the cache via `replaceDocuments`; failures keep stale data but report errors through both toast and hook state.
3. **Deletion flows** – `deleteDocument` and `deleteAllDocuments` call the respective helpers in `src/lib/file-search.ts`, update `LocalStorage` via `removeDocument`/`replaceDocuments`, and gate the action behind destructive `confirmAlert` dialogs.
4. **Rendering & actions** – The list displays size, upload date, and a status tag derived from `getStatusAccessory`. The action panel supports refreshing, launching the upload command, copying the document ID, and deleting one or all documents. An empty-state view nudges users toward uploading before refreshing.

**Operational notes**
- Because File Search can linger in `STATE_PENDING`, the status tag exposes “Processing” so users know why Ask might not find the latest uploads yet.
- Bulk delete loops through every document returned by File Search and calls the delete endpoint individually; large libraries will therefore take longer to purge.

## Ask Command
1. **UI framing** – `src/ask-it.tsx` renders a fixed “Prompt” row bound to the search bar plus a “History” section once questions exist. History entries show Raycast `List.Detail` markdown with metadata describing citations.
2. **State management** – `useAskQuestion` owns the conversation, cached documents, spinner state, and entry list (`src/hooks/useAskQuestion.ts`). It eagerly loads cached documents on mount so citation mapping works even before the List command refreshes.
3. **Question submission** – Triggering `ask` trims the question, ignores empty strings, raises an optimistic “pending” entry, and shows an animated toast. The hook builds the Gemini history via `buildAskHistory` and forwards the request to `runAskFlow`.
4. **Model call & logging** – `runAskFlow` ensures the File Search store exists, calls Gemini with File Search tools enabled, extracts the answer/citations via `extractCitations`, and appends the model response into the trimmed conversation (max 10 messages). The hook logs store metadata, grounding chunk summaries, and citation previews for debugging.
5. **Result handling** – Successful entries flip to `status: "ready"` with their markdown answer and citations. Errors persist on the entry with the failure message, update the toast, and keep history intact for re-asking. `clearHistory` resets both entries and conversation, giving the user a clean slate.
6. **Interactions** – Actions let users copy the answer, copy citations, repeat a question, or clear the entire history. “Ask Follow-Up” simply clears the search bar to encourage a new prompt.

**Operational notes**
- Conversation history is in-memory only; relaunching the command starts from an empty conversation.
- If the command is launched while a List refresh is still processing documents, citations might temporarily lack friendly names because the cache has not been updated yet.

## AI Tools
- **Shared helpers**: Both tools call the same upload and ask primitives used by the commands. Keep `src/lib/upload.ts` and `src/lib/ask.ts` as the canonical source of truth when changing validation, logging, or store handling.
- **Ask tool**: `src/tools/ask.ts` validates the question, calls `askLibrary`, logs result summaries, and returns a structured `{ success, answer, citations }` payload. It mirrors the Ask command but without any UI state.
- **Note tool**: `src/tools/note.ts` composes a Markdown file in the OS temp directory, enforces the same size limits (pre- and post-write), uploads via `uploadFilesToLibrary`, and deletes the temp file inside a `finally` block even if the upload fails. The returned metadata mirrors what List expects.
- **Tool registration**: `package.json` defines the `ask` and `note` tools inside the `raycast.tools` array, so Raycast AI can invoke them using the same descriptions surfaced in the UI.

## Handoff Checklist
1. Confirm the Raycast preferences include a shared `store-display-name` so every command/tool targets the same File Search store.
2. Run Upload → List (refresh) → Ask sequentially to verify uploads populate the cache, show in the list, and ground Ask results with citations from the correct documents.
3. Capture a snippet via Quick Note, then refresh the List command to ensure the note appears with the derived title.
4. Exercise both delete flows in the List command to ensure cache consistency and toast messaging still match expectations.
5. When changing File Search integration details, update `ensureFileSearchStore`, `uploadFilesToLibrary`, and `runAskFlow` first because every command and tool flows through those utilities.
