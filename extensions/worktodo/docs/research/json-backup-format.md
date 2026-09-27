# Worktodo JSON Backup Format

Status: implemented
Last verified: 2026-09-05

## Version 3 contract

A backup is UTF-8 JSON with this top-level shape:

```ts
type WorktodoBackupDocument = {
  format: "worktodo-backup";
  version: 3;
  exportedAtMs: number;
  projects: Project[];
  labels: Label[];
  tasks: Task[];
};
```

The Project, Label, and Task definitions come from [task-model.md](task-model.md). Each Task stores
its complete canonical `labelIds` set and boolean `priority`. Every stable ID, display value, position, Due value,
lifecycle timestamp, and Task timestamp is preserved.

Serialization uses two-space JSON indentation, a final newline, Project/Label/Task collections
ordered by ID, and each Task assignment ordered by canonical Label order. Import rejects unknown
fields, malformed IDs, invalid timestamps or Due values, duplicate entity IDs, duplicate normalized
Label names, duplicate Task Label IDs, and missing Project or Label relationships.

Every Unix-millisecond timestamp, including `exportedAtMs` and timed Due instants, must be a
non-negative integer representable by JavaScript `Date` (`0` through `8640000000000000`).

## Version 1 and version 2 compatibility

Versions 1 and 2 are import-only. Their string priority values convert to the version 3 boolean:
only `high` becomes `true`; `medium`, `low`, and `none` become `false`. Version 1's `sections`
collection and each Task `sectionId` are parsed with a strict isolated schema, validated, and
converted to Labels before preview or replacement.

Conversion follows the production database migration:

- Sections are visited in canonical Project and Section order.
- The first Section for a normalized name retains identity; later collisions merge.
- Empty Sections produce Labels.
- Direct Project Tasks precede converted Section Tasks.
- Section Tasks remain in their Project and receive the converted Label.
- Content, Due values, lifecycle state, identity, and timestamps are preserved.

Every new export and automatic recovery backup uses version 3.

## Import workflow

Worktodo accepts one absolute `.json` file up to 100 MiB, verifies it did not change while being
read, parses the complete document, and then shows mutually exclusive lifecycle counts for the
current and incoming Projects, Labels, and Tasks.

Replacement requires explicit confirmation. In one database transaction Worktodo:

1. verifies that the complete current snapshot still matches the preview;
2. publishes an owner-only version 3 recovery backup of current data;
3. deletes Task associations, Tasks, Labels, and Projects in foreign-key-safe order;
4. inserts the selected canonical snapshot;
5. runs SQLite integrity and foreign-key checks; and
6. compares the stored result with the selected backup.

If any current Project, Label, Task, relationship, ordering value, Due value, note, timestamp, or
lifecycle state changed after preview, Worktodo rejects the restore before creating a recovery
backup and requires a new preview.

Any failure rolls the database back and reports whether a recovery file was already published.
Recovery files are never overwritten.

Backup publication flushes the candidate file before creating its final name, then synchronizes the
destination directory before reporting success. Recovery-directory preparation also synchronizes
the directory and its parent. These barriers use the supported macOS filesystem operations; they do
not claim protection from hardware or filesystem implementations that violate flush guarantees.

## Verification

The backup contract, export, preview, replacement, recovery, file-stability, and presentation suites
exercise version 3 round trips and version 1 and 2 compatibility. The repository-wide gate is
`npm run verify`.
