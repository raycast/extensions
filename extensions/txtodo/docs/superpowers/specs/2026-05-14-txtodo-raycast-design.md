# TXTodo — Raycast extension for todo.txt

**Date:** 2026-05-14
**Status:** Design — pending implementation

## 1. Context and goals

Build a Raycast extension that manages tasks in the [todo.txt](http://todotxt.org) plain-text format. The experience model is "get in, do the thing, get out": triggered by a global hotkey, navigated entirely by keyboard, exited as fast as it was entered. The benchmark is the feel of TUI apps like `tuxido` — but native to macOS via Raycast.

The extension shares its data file with other todo.txt tools (terminal editors, `tuxido`, etc.), so plain text on disk is the source of truth. There is no database, no sync service, no app-owned state beyond what's in the file.

## 2. Scope

### In scope

- Two Raycast commands: a list view and a no-view quick-add
- Full todo.txt spec coverage: priority, description, `+project`, `@context`, creation date, completion date, `key:value` metadata (including `due:`)
- Raw line editor for edits and quick-add
- Manual archive of completed tasks to `done.txt`, with an optional preference to auto-archive on complete
- Configurable file paths via Raycast preferences
- Sorting: grouped by priority (A → Z → "No priority"), within each group by `due:` ascending then file order
- Atomic writes with mtime-based conflict detection
- File watcher for external changes
- Full TDD coverage of domain and I/O layers

### Out of scope

- Menu bar extra with pending count
- Always-on-top floating panel
- Recurring tasks, reminders, notifications
- Cloud sync (the file may live in iCloud/Dropbox; that's the user's setup, not ours)
- Conflict UI with diff view — toast + refresh is the resolution
- Backup files — atomic writes plus the user's own VCS cover this
- Auto-repair of corrupted files

## 3. Architecture overview

Three-layer separation with strict dependency direction:

```
src/
  domain/
    task.ts         Task type, immutable transforms (complete, setPriority, ...)
    parser.ts       parseLine(line) → Task; serializeTask(task) → line
    sort.ts         groupByPriority + sortByDueThenFileOrder
  io/
    todoFile.ts     read(), writeAtomic(), watch() — fs only, no React
  commands/
    tasks.tsx       view command — list, ActionPanel, edit form
    quick-add.tsx   no-view command — append raw line
  preferences.ts    typed accessor for Raycast preferences
package.json        commands, preferences, dependencies
```

**Dependency direction:**
- `domain/` depends on nothing
- `io/` depends only on `domain/`
- `commands/` depends on both
- Nothing in `domain/` or `io/` imports from `@raycast/api` or `react`

This is what makes the codebase testable: the bottom layers are pure Node + TypeScript and can be exercised by Vitest with no Raycast harness.

## 4. Domain model

### Task type (immutable)

```ts
type Priority = 'A' | 'B' | ... | 'Z';

type Task = {
  raw: string;                          // original line, preserved verbatim
  completed: boolean;
  completionDate?: string;              // ISO YYYY-MM-DD
  priority?: Priority;
  creationDate?: string;                // ISO YYYY-MM-DD
  description: string;                  // text minus tags/metadata, trimmed
  projects: string[];                   // e.g. ['health', 'home']
  contexts: string[];                   // e.g. ['phone', 'errands']
  metadata: Record<string, string>;     // e.g. { due: '2026-05-20' }
  lineNumber: number;                   // index in source file
};
```

`raw` lets us round-trip lines whose syntax we don't fully understand (forward-compatibility for any spec extension we missed). `lineNumber` is the stable identity used to splice a single line into the file when applying a transform.

### `parser.ts`

- `parseLine(line: string, lineNumber: number): Task` — tolerant. On malformed input, returns a Task with just `raw` set and `description = line`. Never throws.
- `serializeTask(task: Task): string` — builds the canonical line from fields. Used for new tasks and transforms.
- Blank lines in source are dropped on read (todo.txt convention; not preserved positionally).

### `task.ts` — pure transforms

Each function takes a `Task` and returns a new `Task` with `raw` re-serialized:

- `complete(task, today)` — sets `completed = true`, prepends `x YYYY-MM-DD`, sets `completionDate`
- `uncomplete(task)` — inverse
- `setPriority(task, prio | undefined)` — adds, replaces, or removes the `(X)` prefix
- `withCreationDate(task, today)` — used by quick-add when `autoStampCreationDate` preference is on

### `sort.ts`

- `groupByPriority(tasks): Map<Priority | 'none', Task[]>` — buckets A → Z plus `'none'`
- `sortGroup(tasks): Task[]` — `due:` ascending (missing dates sort last), then `lineNumber` ascending
- UI consumes groups in declared order: A, B, …, Z, none. Empty groups are omitted.

## 5. File I/O layer

`io/todoFile.ts` is the only module that touches `fs`. All functions take paths as arguments — no globals.

### Read

```ts
type FileSnapshot = {
  path: string;
  mtimeMs: number;        // captured at read time
  tasks: Task[];          // parsed, lineNumber assigned
  raw: string;            // original file content
};

async function read(path: string): Promise<FileSnapshot | 'notfound'>
```

`'notfound'` is a sentinel returned when the file does not exist. All other errors propagate. Line endings are `\n` only — Raycast is macOS-only.

### Atomic write with mtime check

```ts
async function writeAtomic(
  snapshot: FileSnapshot,
  nextTasks: Task[],
): Promise<{ kind: 'ok'; snapshot: FileSnapshot } | { kind: 'conflict'; fresh: FileSnapshot }>
```

Algorithm:

1. `stat(snapshot.path)` → `currentMtime`
2. If `currentMtime !== snapshot.mtimeMs` → return `{ kind: 'conflict', fresh: <new snapshot from re-read> }`
3. Serialize `nextTasks` (joined with `\n`, trailing newline)
4. Write to `${path}.tmp-${pid}-${rand}`, then `fs.rename` to `path` (atomic on the same filesystem)
5. Re-stat and return `{ kind: 'ok', snapshot: <new snapshot with fresh mtime> }`

### Conflict resolution policy (called from UI)

- **Task transform** (complete, prioritize, delete a specific task): on conflict, re-read, locate the same task by `raw` content (not `lineNumber`), re-apply transform, retry once. If still conflicting, surface a toast: "todo.txt changed externally — refreshed."
- **Quick-add** (append): trivial. Re-read, append, write. Retry up to 3 times.

### Watcher

```ts
function watch(path: string, onChange: () => void): () => void  // returns disposer
```

- Uses `fs.watch` with `{ persistent: false }`
- Debounced 150ms (some editors emit two writes per save)
- Ignores changes we initiated ourselves via a small in-process mtime allowlist
- On change, UI re-runs `read()` and replaces in-memory state

### Done file

`appendToDone(donePath, completedTasks)` — append-only, atomic. No mtime check (no one reads `done.txt` continuously).

## 6. UI layer

### `show-tasks` (view command)

Raycast's `List` with one `List.Section` per priority group, in order A → Z → "No priority". Empty sections omitted.

**Item rendering:**

- `title` — description text with tags stripped (tags appear as accessories)
- `accessories` — `+project` and `@context` chips; `due:` chip with calendar icon if present
- `icon` — colored circle keyed to priority: A red, B orange, C yellow, D–Z blue, none gray
- Completed tasks de-emphasized via gray icon and a leading checkmark glyph in the title (Raycast `List.Item` does not support strikethrough natively)

**Filtering:**

- Raycast's built-in search bar covers fuzzy filtering across title + accessories — typing `+health` or `@phone` narrows naturally
- A `List.Dropdown` at the top toggles "All / Active / Completed"
- No separate project/context dropdown — the search bar handles it (YAGNI)

**ActionPanel:**

| Action | Shortcut | Notes |
|---|---|---|
| Toggle complete | `Enter` (primary) | Auto-stamps completion date; if `archiveOnComplete` is on, moves to done.txt immediately |
| New task | `⌘N` | Opens a blank raw-line Form; same code path as edit but appends instead of replacing |
| Edit raw | `⌘E` | Opens Form with raw line pre-filled |
| Set priority | `⌘P` then `A`–`Z` (or `0` to clear) | Submenu; `0` removes the priority entirely |
| Bump priority higher / lower | `⌘↑` / `⌘↓` | `⌘↑` moves toward `(A)`; `⌘↓` moves toward `(Z)` and eventually clears |
| Delete | `⌃X` | Removes the line; undo via toast action |
| Archive completed | `⌘⇧A` | Moves all completed lines to done.txt |
| Open todo.txt in editor | `⌘O` | Raycast `open` API; uses the user's default `.txt` handler |
| Reload | `⌘R` | Manual refresh (watcher usually makes this redundant) |

**Keyboard-first reality:** Raycast's search bar consumes raw letter keys, so pure single-key shortcuts (just `c` to complete) are not possible. The keyboard-first promise becomes: arrow keys navigate, Enter is the primary action, `⌘+letter` covers everything else, no mouse ever. This matches every other Raycast extension's idiom.

### Edit / New Task form

A single Raycast `Form` component used in two modes:

- **Edit mode** — `TextField` named `raw` pre-filled with the existing line; Save replaces the line in place
- **New mode** — same `TextField`, empty; Save appends a new line (auto-stamping the creation date if `autoStampCreationDate` is on)
- Primary action "Save" (`⌘↵`) re-parses input and calls `writeAtomic` with the conflict-resolution flow described in §5

One component, one code path; mode is a prop.

### `add-task` (no-view command)

`package.json` declares one required argument: `task` (string).

Flow:

1. Parse the raw input via `parseLine`
2. If `autoStampCreationDate` is on and the parsed task has no creation date, prepend today
3. `read(path)` → snapshot
4. Append parsed task to snapshot's task list
5. `writeAtomic` with retry-on-conflict (up to 3×)
6. `showHUD("✓ Added: <description>")` and exit

No list renders. Global hotkey → type → Enter → HUD → gone.

### Preferences (declared in `package.json`)

- `todoPath` (FilePicker, default `~/todo.txt`)
- `donePath` (FilePicker, default `~/done.txt`)
- `archiveOnComplete` (Checkbox, default `false`)
- `autoStampCreationDate` (Checkbox, default `true`)

### State management in `tasks.tsx`

- `useState<FileSnapshot | 'notfound' | undefined>` for current state
- On mount: `read()` plus register `watch` callback
- Each action computes next tasks via domain transforms, calls `writeAtomic`, updates state on success or surfaces a toast on conflict-after-retry
- Watcher-triggered re-reads ignore self-writes via the mtime allowlist in `todoFile.ts`

## 7. Error handling

Three categories of failure, each with a distinct response:

### Recoverable, expected — surface as toast/HUD, keep going

- mtime conflict after retry → toast "todo.txt changed externally — refreshed" plus force re-read
- File appears mid-session after being absent → watcher catches it, transitions from `'notfound'` to populated list silently
- Quick-add receives an unparseable string → still append (todo.txt is forgiving; weird lines round-trip via `raw`), but show HUD "Added (couldn't fully parse)"

### Recoverable, structural — explicit empty state

- File doesn't exist on first read → `'notfound'` state shows empty view with a single action "Create todo.txt at \<path\>" (touches the file, kicks off a normal read)
- File is empty (exists, zero bytes) → empty list with onboarding text "No tasks yet — press ⌘N to add one"
- File contains only blank lines → same as above

### Unexpected — fail loud, don't corrupt

- Read fails with `EACCES` / `EISDIR` → toast "Couldn't read \<path\>: \<message\>" plus "Open Preferences" action
- Write fails after temp file created → `unlink` the temp file, toast "Save failed: \<message\>", state unchanged (this is the value of atomic writes — the original file is untouched)
- Parse throws defensively → fall back to a `Task` containing only `raw`, surface a one-time toast "Some lines couldn't be parsed (preserved as-is)"

### Explicitly out of scope

- Conflict UI with diff view — refresh + toast only
- Backup file (`todo.txt.bak`) — atomic writes plus the user's own VCS cover this
- Recovery from corrupted file — if the file is unreadable text, the user fixes it; we don't try to repair
- Retry beyond the documented limits (3× for append, 1× for transform)

## 8. Testing strategy

TDD discipline: every domain function and every I/O function is written test-first. UI components have lighter coverage (smoke + integration), since Raycast's headless test story is weak and the layered architecture keeps UI thin.

**Framework:** Vitest. Run via `npm test` locally and in CI.

### `domain/` — pure unit tests

- `parser.test.ts` — table-driven, every example from the todo.txt spec page, plus malformed inputs (round-trip must preserve `raw`)
- `task.test.ts` — each transform: complete preserves date, setPriority covers add/replace/remove, edge cases (completing an already-completed task is a no-op)
- `sort.test.ts` — grouping correctness, due-date ordering, stable file-order tiebreaker, "no priority" bucket last

### `io/` — integration tests against a tmp dir

- Each test creates a tmp file via `fs.mkdtemp`, runs the code, cleans up
- `read` returns `'notfound'` for missing file, returns snapshot with stable mtime when present
- `writeAtomic` round-trips a snapshot; a second writer with stale mtime sees `conflict`; concurrent appends from spawned subprocesses settle deterministically
- `watch` fires `onChange` when an external process writes, debounces correctly (fake timers)
- No mocks of `fs` — the real filesystem in a tmp dir is more honest than mocks

### `commands/` — smoke + integration

- Render `tasks.tsx` against a fixture file (using `@raycast/api` test helpers when available; otherwise mount with React Testing Library and stub Raycast components)
- Verify: items render grouped, ActionPanel actions exist, edit form pre-fills correctly
- One end-to-end happy path per command — quick-add → re-read → item appears

### Coverage targets

- `domain/`: 100%
- `io/`: ~90%
- `commands/`: smoke-level

Reported via Vitest's built-in coverage tooling.

### Not tested

- Raycast API behavior itself (their responsibility)
- macOS filesystem semantics beyond what `fs.rename` guarantees
- Visual / pixel-level layout

## 9. Decisions log

| Decision | Choice |
|---|---|
| Format scope | Full todo.txt spec: priority, description, `+project`, `@context`, creation date, completion date, `key:value` metadata |
| Edit UX | Raw line editor (single text field) for both edit and quick-add |
| Archive trigger | Manual by default; `archiveOnComplete` preference for auto |
| File paths | Configurable via Raycast preferences (`todoPath`, `donePath`) |
| Sort order | Grouped by priority A → Z → none; within group, `due:` ascending then file order |
| Unprioritized tasks | Own group after Z |
| Write safety | Atomic writes via temp + rename, plus mtime conflict detection |
| First-run behavior | Empty state with explicit "Create file" action |
| Architecture | Three-layer (domain / I/O / UI) with strict dependency direction |
