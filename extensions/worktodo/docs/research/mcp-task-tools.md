# Worktodo MCP Task Tools

**Status:** Implemented and locally validated on 2026-09-05.

Worktodo exposes its shared task domain through a local STDIO MCP server. The adapter calls the same
`TaskService` used by Raycast and never receives direct SQL access or alternate task rules. Each tool
call opens and closes its own production session so the long-lived MCP process does not retain a
database connection between operations.

## Current platform evidence

The installed client is Codex CLI `0.145.0`. Its MCP command accepts the documented local STDIO
configuration fields and reports configured servers through `codex mcp list`. The current official
[Codex MCP documentation](https://developers.openai.com/codex/mcp/) confirms that ChatGPT desktop,
Codex CLI, and the IDE extension support local STDIO servers and share MCP configuration. It also
documents server instructions and approval policies that can prompt for tools not marked read-only.

The repository already had an SDK-to-SDK STDIO test for the diagnostic `ping` tool. The implementation
extends that test to discover the task surface and adds an in-memory protocol test that exercises every
task operation. A live tool call through the installed Codex agent remains a manual smoke test because
automating it would launch a separate model session rather than only testing the local protocol.

## Tool contract

| Tool            | Read-only | Destructive | Idempotent | Purpose                                                        |
| --------------- | --------- | ----------- | ---------- | -------------------------------------------------------------- |
| `ping`          | Yes       | No          | Yes        | Report server and runtime readiness.                           |
| `list_projects` | Yes       | No          | Yes        | Page and search projects with stable IDs.                      |
| `list_labels`   | Yes       | No          | Yes        | Page and search global Labels with stable IDs.                 |
| `list_tasks`    | Yes       | No          | Yes        | Page and search tasks in one supported task view.              |
| `get_task`      | Yes       | No          | Yes        | Return one task by stable ID, including Trash and Completed.   |
| `create_task`   | No        | No          | No         | Create an active task, defaulting to no Project.               |
| `update_task`   | No        | Yes         | Yes        | Replace selected content fields or Label assignments.          |
| `move_task`     | No        | Yes         | Yes        | Assign or clear an active task's Project.                      |
| `complete_task` | No        | Yes         | Yes        | Complete an active task.                                       |
| `reopen_task`   | No        | Yes         | Yes        | Reopen an active completed task.                               |
| `trash_task`    | No        | Yes         | Yes        | Move a task to recoverable Trash without deleting its content. |
| `restore_task`  | No        | Yes         | Yes        | Restore a task while preserving its completion state.          |

`list_tasks` supports `all`, `today`, `thisWeek`, `completed`, `trash`, `project`, and `label`
views. Project and Label views require their matching stable ID. Search uses Unicode NFKC plus
locale-independent lowercase normalization across title, notes, Project name, and assigned Label
names, and runs before pagination. All list tools default to 50 results and reject limits above 100;
results report the offset, total, and whether another page exists.

Task inputs use an optional `projectId`, a boolean `priority`, and the approved closed due-value union. Priority defaults
to `false`, changes only visual emphasis, and never changes task order. An all-day due value is
a Gregorian `YYYY-MM-DD` string. A timed value is an exact non-negative Unix-millisecond instant plus
an IANA timezone. Every task-list view validates and canonicalizes its timezone. The timezone defaults
to the MCP process's current system timezone, but callers can provide another timezone explicitly.
Every Task document also includes canonical `labelIds`. `create_task` can set the complete assignment
set. For `update_task`, omitting `labelIds` preserves assignments and passing an empty list clears them.
`move_task` changes only the nullable Project assignment.

## Safety and failure behavior

- No tool exposes arbitrary SQL, shell access, permanent task deletion, or Project and Label-definition writes.
- MCP marks every state-replacing operation as destructive; only task creation is an additive write.
- Domain failures return bounded error codes and messages as MCP tool errors.
- Unexpected infrastructure failures are logged to stderr and returned as a generic internal error;
  database paths and exception details are not placed in tool results.
- Every successful result includes structured content plus a concise text fallback.
- Notes and URLs are returned as data and are never opened or executed by the server.
- MCP writes do not claim an unsupported immediate Raycast menu refresh. They become visible on the
  next host-supported load or background refresh.

## Local validation

The protocol tests prove:

- discovery of all twelve tools and the server instructions;
- exact read-only, destructive, idempotent, and closed-world annotations;
- Project and Label ID discovery;
- create, search, get, update, move, complete, reopen, Trash, and restore behavior, including complete
  Label assignment replacement;
- Today evaluation in an explicit timezone, Label views, normalized Label-name search, and filtering
  before pagination;
- production-session closure after both successful and failed calls;
- bounded domain errors and suppression of unexpected infrastructure details; and
- compiled STDIO discovery, a structured `ping` call, and a labelled Task round trip through the
  official TypeScript client.
