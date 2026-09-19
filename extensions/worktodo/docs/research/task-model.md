# Worktodo Task Model

Status: implemented
Last verified: 2026-09-05

## Model

Worktodo stores Projects, global Labels, and Tasks. A Task optionally belongs to one Project and has
zero or more Labels. Its Due value is independent of its Project.

### Project

| Field         | Required | Meaning                                     |
| ------------- | -------- | ------------------------------------------- |
| `id`          | Yes      | Stable lowercase UUID v4.                   |
| `name`        | Yes      | Non-empty trimmed display name.             |
| `position`    | Yes      | Non-negative integer used for ordering.     |
| `createdAtMs` | Yes      | Creation time in Unix epoch milliseconds.   |
| `updatedAtMs` | Yes      | Most recent Project change in milliseconds. |

### Label

| Field         | Required | Meaning                                   |
| ------------- | -------- | ----------------------------------------- |
| `id`          | Yes      | Stable lowercase UUID v4.                 |
| `name`        | Yes      | Non-empty trimmed global display name.    |
| `position`    | Yes      | Non-negative integer used for ordering.   |
| `createdAtMs` | Yes      | Creation time in Unix epoch milliseconds. |
| `updatedAtMs` | Yes      | Most recent Label change in milliseconds. |

Label names are globally unique after Unicode NFKC normalization and locale-independent lowercase
conversion. Labels are ordered by `(position ASC, createdAtMs ASC, id ASC)`.

Every Unix-millisecond timestamp is a non-negative integer representable by JavaScript `Date`, from
`0` through `8640000000000000`. Positions use the wider non-negative safe-integer range.

### Task

| Field           | Required | Meaning                                                         |
| --------------- | -------- | --------------------------------------------------------------- |
| `id`            | Yes      | Stable lowercase UUID v4.                                       |
| `title`         | Yes      | Non-empty trimmed title.                                        |
| `notes`         | Yes      | Plain text, including Unicode and URLs.                         |
| `priority`      | Yes      | Boolean visual emphasis; `false` by default.                    |
| `position`      | Yes      | Non-negative order within its optional Project.                 |
| `projectId`     | No       | Null for no Project, otherwise one existing Project ID.         |
| `labelIds`      | Yes      | Unique existing Label IDs in canonical Label order.             |
| `due`           | Yes      | No due value, an all-day date, or a timed instant and timezone. |
| `createdAtMs`   | Yes      | Creation time in Unix epoch milliseconds.                       |
| `updatedAtMs`   | Yes      | Most recent effective Task change.                              |
| `completedAtMs` | No       | Completion time, retained while the Task is in Trash.           |
| `trashedAtMs`   | No       | Recoverable Trash time.                                         |

Project assignment is a nullable stable Project ID. Label assignment never changes the Project.
Assigning or clearing a Project, removing a Project, and every lifecycle transition preserve
`labelIds`.

Task assignment is a set. Duplicate, malformed, or missing Label IDs are rejected before a write.
Service results always use canonical Label order. Replacing an assignment with the same canonical
set is a no-op and preserves `updatedAtMs`; a real change advances it monotonically.

Removing a Label cascades only through Task-to-Label associations. It does not move, complete,
reopen, trash, restore, or delete a Task. Removing a Project clears its Tasks' Project IDs, appends
them after existing no-project Tasks in ordinary Task order, and preserves their Labels and lifecycle values.

## Due and lifecycle rules

An all-day due value is `{ kind: "allDay", date: "YYYY-MM-DD" }` and keeps calendar meaning in the
viewer timezone. A timed value is `{ kind: "timed", instantMs, timeZone }` with an exact safe
integer instant and canonical IANA timezone. `{ kind: "none" }` has no due value.

Today includes active incomplete Tasks overdue before the viewer's local day and Tasks due during
that day. This week includes the same overdue and Today Tasks plus active incomplete Tasks due
through Sunday in the viewer's timezone. Completed excludes Trash; Trash includes trashed Tasks
whether complete or incomplete.

Ordinary Task order is `position`, `createdAtMs`, and `id` ascending. Priority never changes order.
All tasks places dated Tasks first by effective due instant and undated Tasks last.

Completion, reopening, Trash, and restore are idempotent. Content, Project, and Label changes are
blocked while a Task is in Trash. Restore preserves completion state, Project, and Labels.

## Schema migration

Fresh databases are created directly at version 3. Opening version 1 or 2 performs one atomic
migration under `BEGIN IMMEDIATE`:

- Projects and Sections are read in canonical Project and Section order.
- The first Section for each normalized name retains its ID, name, and timestamps as a global
  Label; later normalized-name matches merge into it. Empty Sections also become Labels.
- Direct Project Tasks come first. Section Tasks follow in canonical Section and Task order, stay
  in the same Project, and receive the converted Label.
- Task identity, content, Due values, lifecycle values, and timestamps are preserved.
- The Task table is rebuilt without Section assignment, foreign keys are checked, and
  `user_version` advances only when the transaction succeeds.
- The version 3 Task table stores priority as constrained integer `0` or `1`. Legacy `high` values
  become `1`; `medium`, `low`, and `none` become `0`. Every other Task field and Label association
  is preserved.

## SQLite schema design

The following block is the exact schema exercised by the production migration tests.

<!-- task-model-schema:start -->

```sql
BEGIN IMMEDIATE;
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms)
) STRICT;

CREATE TABLE labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  name_key TEXT NOT NULL UNIQUE CHECK (length(name_key) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms)
) STRICT;

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  notes TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority IN (0, 1)),
  position INTEGER NOT NULL CHECK (position >= 0),
  project_id TEXT,
  due_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (due_kind IN ('none', 'all_day', 'timed')),
  due_date TEXT,
  due_at_ms INTEGER,
  due_timezone TEXT,
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms),
  completed_at_ms INTEGER CHECK (
    completed_at_ms IS NULL OR
    (completed_at_ms >= created_at_ms AND completed_at_ms <= updated_at_ms)
  ),
  trashed_at_ms INTEGER CHECK (
    trashed_at_ms IS NULL OR
    (trashed_at_ms >= created_at_ms AND trashed_at_ms <= updated_at_ms)
  ),
  CHECK (
    (due_kind = 'none' AND due_date IS NULL AND due_at_ms IS NULL AND due_timezone IS NULL) OR
    (
      due_kind = 'all_day' AND
      due_date IS NOT NULL AND
      due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND
      length(due_date) = 10 AND
      due_at_ms IS NULL AND
      due_timezone IS NULL
    ) OR
    (
      due_kind = 'timed' AND
      due_date IS NULL AND
      due_at_ms IS NOT NULL AND
      due_at_ms >= 0 AND
      due_timezone IS NOT NULL AND
      length(trim(due_timezone)) > 0
    )
  ),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) STRICT;

CREATE TABLE task_labels (
  task_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels (id) ON UPDATE RESTRICT ON DELETE CASCADE
) STRICT;

CREATE INDEX projects_order_idx
  ON projects (position, created_at_ms, id);
CREATE INDEX labels_order_idx
  ON labels (position, created_at_ms, id);
CREATE INDEX tasks_project_fk_idx
  ON tasks (project_id);
CREATE INDEX task_labels_label_idx
  ON task_labels (label_id, task_id);
CREATE INDEX tasks_inbox_order_idx
  ON tasks (position, created_at_ms, id)
  WHERE project_id IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_all_day_today_idx
  ON tasks (due_date, position, created_at_ms, id)
  WHERE due_kind = 'all_day' AND completed_at_ms IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_timed_today_idx
  ON tasks (due_at_ms, position, created_at_ms, id)
  WHERE due_kind = 'timed' AND completed_at_ms IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_completed_idx
  ON tasks (completed_at_ms DESC, id)
  WHERE completed_at_ms IS NOT NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_trashed_idx
  ON tasks (trashed_at_ms DESC, id)
  WHERE trashed_at_ms IS NOT NULL;

PRAGMA user_version = 3;
COMMIT;
```

<!-- task-model-schema:end -->

## Verification

`tests/shared/production-schema.test.ts` covers fresh creation, populated version 1 and version 2
conversion, normalized collision merging, empty Sections, high-only priority conversion, ordering,
lifecycle preservation, rollback, concurrent startup, foreign keys, reopen, and future-version
rejection.
`tests/shared/domain-operations.test.ts` covers Label lifecycle and assignment through the
production SQLite repository. The repository-wide gate is `npm run verify`.
