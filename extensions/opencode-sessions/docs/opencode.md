# OpenCode Storage Format

Reference for the opencode filesystem storage layout as of v1.1.x (migration version 2).

Source: https://github.com/sst/opencode (`packages/opencode/src/storage/`)

> The storage format is internal to opencode and has no stability guarantees.
> The official client interface is the HTTP API via `@opencode-ai/sdk`.
> This extension reads files directly for speed; see "Resilience" at the bottom.

## Base Path

```
$XDG_DATA_HOME/opencode/storage/
```

Typically:
- Linux: `~/.local/share/opencode/storage/`
- macOS: `~/.local/share/opencode/storage/` (opencode uses XDG, not `~/Library/Application Support`)

## Directory Layout

```
storage/
  migration                              # Plain text file containing migration version (currently "2")
  project/
    <projectID>.json                     # Project metadata
    global.json                          # Pseudo-project for sessions outside any git repo
  session/
    <projectID>/
      <sessionID>.json                   # Session metadata
  message/
    <sessionID>/
      <messageID>.json                   # Message metadata
  part/
    <messageID>/
      <partID>.json                      # Message part (text, tool call, etc.)
  session_diff/
    <sessionID>.json                     # Full file diffs for the session (added in migration 2)
  share/
    <sessionID>.json                     # Share metadata (secret, URL) for shared sessions
```

## ID Formats

All IDs are ULID-based with a type prefix:
- Session: `ses_<ulid>` (reverse-sorted -- newer IDs sort first alphabetically)
- Message: `msg_<ulid>`
- Part: `prt_<ulid>`
- Project: git root commit SHA (first commit hash from `git rev-list --max-parents=0 --all`), or `"global"`

## Storage Keys

opencode's `Storage.write(key, data)` maps key arrays to filesystem paths:
- `["project", projectID]` -> `project/<projectID>.json`
- `["session", projectID, sessionID]` -> `session/<projectID>/<sessionID>.json`
- `["message", sessionID, messageID]` -> `message/<sessionID>/<messageID>.json`
- `["part", messageID, partID]` -> `part/<messageID>/<partID>.json`

## Entity Schemas

### Project

```jsonc
{
  "id": "096906eda8b9cd5e...",      // Git root commit hash or "global"
  "worktree": "/Users/mike/myproject", // Absolute path to git worktree root ("/" for global)
  "vcs": "git",                      // Optional, only for git repos
  "name": "myproject",              // Optional display name
  "time": {
    "created": 1770000000000,        // Unix ms
    "updated": 1770000000000
  },
  "sandboxes": []                    // Additional worktree paths
}
```

### Session

```jsonc
{
  "id": "ses_3c0a0e7e3ffepxBh...",
  "slug": "calm-wolf",               // Random two-word slug
  "version": "1.1.53",               // OpenCode version that created it
  "projectID": "096906eda8b9cd5e...",
  "directory": "/Users/mike/myproject",
  "parentID": "ses_...",             // Present on sub-agent sessions (child of another session)
  "title": "Fix build errors",
  "time": {
    "created": 1770000000000,
    "updated": 1770000000000,
    "compacting": 1770000000000,     // Optional, when context compaction last ran
    "archived": 1770000000000        // Optional, when session was archived
  },
  "summary": {                       // Optional, computed after each turn
    "additions": 42,
    "deletions": 10,
    "files": 3
  },
  "share": {                         // Optional, present if session was shared
    "url": "https://share.opencode.ai/..."
  },
  "permission": [...]                // Optional, permission rules for sub-agents
}
```

### Message

Two roles share the same directory. Discriminated by `role`.

**User message:**
```jsonc
{
  "id": "msg_c3f5f182e001...",
  "sessionID": "ses_...",
  "role": "user",
  "time": { "created": 1770000000000 },
  "agent": "code",                    // Agent that will handle this message
  "model": {                          // Model selected for this turn
    "providerID": "anthropic",
    "modelID": "claude-sonnet-4-20250514"
  },
  "summary": {                        // Optional, computed summary
    "title": "Fix build errors",
    "diffs": [...]
  }
}
```

**Assistant message:**
```jsonc
{
  "id": "msg_c3f5f1839001...",
  "sessionID": "ses_...",
  "role": "assistant",
  "time": {
    "created": 1770000000000,
    "completed": 1770000000000       // When generation finished
  },
  "parentID": "msg_...",             // References the user message this responds to
  "modelID": "claude-sonnet-4-20250514",
  "providerID": "anthropic",
  "agent": "code",
  "cost": 0.0123,                    // USD cost for this response
  "tokens": {
    "input": 5000,
    "output": 1200,
    "reasoning": 0,
    "cache": { "read": 4000, "write": 1000 }
  },
  "finish": "end_turn",              // Or "tool-calls", etc.
  "path": {
    "cwd": "/Users/mike/myproject",
    "root": "/Users/mike/myproject"
  }
}
```

### Part

Discriminated union on `type`. All parts share a base:
```jsonc
{ "id": "prt_...", "sessionID": "ses_...", "messageID": "msg_..." }
```

**Key part types:**

| Type | Key Fields | Description |
|------|-----------|-------------|
| `text` | `text` | Text content from user or assistant |
| `tool` | `tool`, `callID`, `state` | Tool invocation with input/output |
| `reasoning` | `text` | Model reasoning/thinking |
| `step-start` | `snapshot` | Marks start of an agent step |
| `step-finish` | `reason`, `cost`, `tokens` | Marks end of an agent step |
| `snapshot` | `snapshot` | Git snapshot reference |
| `compaction` | `auto` | Context compaction marker |

**Tool part `state`:**
```jsonc
{
  "status": "completed",             // "pending" | "running" | "completed" | "error"
  "input": {                         // Tool-specific input (varies by tool)
    "command": "ls -la",             // e.g. for bash
    "filePath": "/path/to/file"      // e.g. for read/edit/write
  },
  "output": "file1.txt\nfile2.txt",  // Tool output string
  "title": "...",                    // Optional display title
  "metadata": { ... },              // Optional tool-specific metadata (diffs, diagnostics, etc.)
  "time": { "start": ..., "end": ... }
}
```

**Tool input keys by tool type:**

| Tool | Input Keys |
|------|-----------|
| `bash` | `command`, `description` |
| `read` | `filePath` |
| `edit` | `filePath`, `oldString`, `newString` |
| `write` | `filePath`, `content` |
| `grep` | `pattern`, `path`, `include` |
| `glob` | `pattern`, `path` |
| `webfetch` | `url`, `format` |
| `task` | `description`, `prompt`, `subagent_type` |

### Session Diff

Extracted from sessions in migration 2. Contains the full file-level diff array:

```jsonc
[
  {
    "file": "/path/to/file.ts",
    "before": "...",                  // Full file content before
    "after": "...",                   // Full file content after
    "additions": 10,
    "deletions": 5,
    "status": "modified"             // "added" | "deleted" | "modified"
  }
]
```

The session's inline `summary` only keeps aggregate counts (`additions`, `deletions`, `files`).

### Share

```jsonc
{
  "secret": "...",
  "url": "https://share.opencode.ai/..."
}
```

## Deletion

When opencode deletes a session (`Session.remove`), it:

1. Recursively deletes all **descendant sessions** (children, grandchildren, etc.)
2. Calls `unshare` (removes `share/<sessionID>.json`)
3. For each message: removes all `part/<messageID>/` directories
4. Removes `message/<sessionID>/` directory
5. Removes `session/<projectID>/<sessionID>.json`

Note: `session_diff/<sessionID>.json` is **not** explicitly cleaned up by opencode's delete (as of v1.1.x). Our extension does clean it up.

## Migrations

The `migration` file contains a plain text number. Current version: `2`.

- **0 -> 1**: Restructured from per-project directories to flat global layout
- **1 -> 2**: Extracted `summary.diffs` arrays from session files into `session_diff/<sessionID>.json`

## Resilience Notes

This extension reads the storage files directly for performance (no server dependency, instant reads). The tradeoffs:

- **Risk**: Storage format changes will break reads. opencode has migrated twice already.
- **Mitigation**: The migration file can be checked to detect version changes.
- **Alternative**: The `@opencode-ai/sdk` package provides a stable HTTP API (`session.list()`, `session.delete()`, etc.) backed by `opencode serve`. The Tauri desktop app uses this exclusively.
- **Future option**: Use SDK for mutations (delete), keep file reads for listing. Spawn server lazily on first mutation.
