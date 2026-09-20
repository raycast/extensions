# Baalda Changelog

## [Raycast Store submission readiness] - {PR_MERGE_DATE}

- Expose the complete Baalda MCP tool surface: list folders, full note updates, targeted edits, note and folder creation/deletion, and note/folder moves
- Add revision-aware append, update and edit inputs, plus confirmation prompts for all writes and destructive operations
- Add Raycast commands for creating and managing notes and folders, including safe revision-aware forms and destructive confirmations

## [Initial Version] - {PR_MERGE_DATE}

- Quick Capture command for instant note capture into a vault
- Search Notes command (semantic + keyword across vaults) with reader and append
- Browse Vault command to explore vaults, folders and notes
- Raycast AI tools: list vaults, search notes, read note, list notes, create note, append to note
- Works against the managed service (api.baalda.com), self-hosted, or a local server via Baalda's MCP endpoint
