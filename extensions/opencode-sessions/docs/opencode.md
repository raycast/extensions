# OpenCode Storage Format

Reference for the opencode SQLite storage as of v1.2.x.

Source: https://github.com/sst/opencode

> The storage format is internal to opencode and has no stability guarantees.
> The official client interface is the HTTP API via `@opencode-ai/sdk`.
> This extension reads the SQLite database directly for speed; see "Resilience" at the bottom.

## Database Path

```
$XDG_DATA_HOME/opencode/opencode.db
```

Typically:

- Linux: `~/.local/share/opencode/opencode.db`
- macOS: `~/.local/share/opencode/opencode.db` (opencode uses XDG, not `~/Library/Application Support`)

WAL mode is enabled (companion files: `opencode.db-shm`, `opencode.db-wal`).

## Migration History

- **v1.1.x and earlier**: Flat JSON files under `~/.local/share/opencode/storage/`
- **v1.2.0**: All flat files migrated to a single SQLite database on first run. Original files are preserved for downgrade safety.

## Schema

### `project`

| Column             | Type    | Notes                           |
| ------------------ | ------- | ------------------------------- |
| `id`               | text PK | Git root commit SHA or "global" |
| `worktree`         | text    | Absolute path to repo root      |
| `vcs`              | text    | "git" or null                   |
| `name`             | text    | Display name (nullable)         |
| `icon_url`         | text    | Nullable                        |
| `icon_color`       | text    | Nullable                        |
| `time_created`     | integer | Epoch ms                        |
| `time_updated`     | integer | Epoch ms                        |
| `time_initialized` | integer | Nullable                        |
| `sandboxes`        | text    | JSON array                      |
| `commands`         | text    | JSON or null                    |

### `session`

| Column              | Type    | Notes                                |
| ------------------- | ------- | ------------------------------------ |
| `id`                | text PK | `ses_<ulid>`                         |
| `project_id`        | text FK | -> `project.id`, CASCADE delete      |
| `parent_id`         | text    | Nullable, references another session |
| `slug`              | text    | Random two-word slug                 |
| `directory`         | text    | Working directory                    |
| `title`             | text    | Session title                        |
| `version`           | text    | OpenCode version                     |
| `share_url`         | text    | Nullable                             |
| `summary_additions` | integer | Nullable                             |
| `summary_deletions` | integer | Nullable                             |
| `summary_files`     | integer | Nullable                             |
| `summary_diffs`     | text    | JSON array or null                   |
| `revert`            | text    | JSON or null                         |
| `permission`        | text    | JSON array or null                   |
| `time_created`      | integer | Epoch ms                             |
| `time_updated`      | integer | Epoch ms                             |
| `time_compacting`   | integer | Nullable                             |
| `time_archived`     | integer | Nullable                             |

Indexes: `session_project_idx`, `session_parent_idx`

### `message`

| Column         | Type    | Notes                           |
| -------------- | ------- | ------------------------------- |
| `id`           | text PK | `msg_<ulid>`                    |
| `session_id`   | text FK | -> `session.id`, CASCADE delete |
| `time_created` | integer | Epoch ms                        |
| `time_updated` | integer | Epoch ms                        |
| `data`         | text    | JSON blob (see below)           |

Index: `message_session_idx`

The `data` column contains:

```jsonc
{
  "role": "user" | "assistant",
  "time": { "created": 1770000000000, "completed": 1770000000000 },
  "parentID": "msg_...",          // Assistant messages reference user message
  "modelID": "claude-sonnet-4-...",
  "providerID": "anthropic",
  "agent": "build",
  "mode": "build",
  "cost": 0.0123,                 // USD
  "tokens": {
    "input": 5000,
    "output": 1200,
    "reasoning": 0,
    "cache": { "read": 4000, "write": 1000 }
  },
  "finish": "end_turn"            // Or "stop", "tool-calls", etc.
}
```

### `part`

| Column         | Type    | Notes                                 |
| -------------- | ------- | ------------------------------------- |
| `id`           | text PK | `prt_<ulid>`                          |
| `message_id`   | text FK | -> `message.id`, CASCADE delete       |
| `session_id`   | text    | Denormalized for fast session queries |
| `time_created` | integer | Epoch ms                              |
| `time_updated` | integer | Epoch ms                              |
| `data`         | text    | JSON blob (see below)                 |

Indexes: `part_message_idx`, `part_session_idx`

The `data` column contains (varies by type):

```jsonc
// Text part
{ "type": "text", "text": "..." }

// Tool part
{
  "type": "tool",
  "tool": "read",
  "callID": "toolu_...",
  "state": {
    "status": "completed",
    "input": { "filePath": "/path/to/file" },
    "output": "...",
    "title": "...",
    "metadata": { ... }
  }
}
```

### Other tables

- `session_share` -- share metadata (session_id, id, secret, url)
- `todo` -- per-session task list (session_id, content, status, priority, position)
- `permission` -- project permission rules
- `control_account` -- OAuth account credentials

## Deletion

Cascade foreign keys handle cleanup:

- Deleting a `session` cascades to `message`, `part`, `todo`, `session_share`
- Deleting a `project` cascades to `session` (and transitively to all children)
- Sub-agent sessions (those with `parent_id`) require recursive deletion via CTE

## Resilience Notes

This extension reads the SQLite database directly for performance (no server dependency, instant reads). The tradeoffs:

- **Risk**: Schema changes will break queries.
- **Mitigation**: We query specific columns, not `SELECT *`. New columns won't break us.
- **Concurrency**: WAL mode allows concurrent readers with opencode. Write operations (deletes) use a 5-second busy timeout.
- **Alternative**: The `@opencode-ai/sdk` package provides a stable HTTP API backed by `opencode serve`.
