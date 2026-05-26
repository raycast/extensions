# Archive view and unarchive

**Date:** 2026-05-25
**Status:** Spec

## Problem

The current "completed tasks" UX in the extension is hard to reason about:

1. **`done.txt` is invisible.** Once tasks are archived, they vanish from the extension. The `donePath` preference exists, but the file is write-only from the UI's perspective — no way to inspect history or recover a task without opening it in a text editor.
2. **The `archiveOnComplete` preference appears to conflict with mark-as-done.** It actually doesn't, but the meaning isn't discoverable from the UI.

The todo.txt format itself is fine: `todo.txt` holds active and completed tasks (completed = `x`-prefixed); `done.txt` is the archive that completed tasks get moved into. The mismatch is purely UX — we expose half of the model.

## Goal

Make `done.txt` browsable inside the extension and add a single mutation: **unarchive**, which moves a task from `done.txt` back to `todo.txt`. Keep all current behavior unchanged: mark-as-done still toggles the `x` prefix in place, "Archive Completed" still bulk-moves x-prefixed tasks, and `archiveOnComplete` still skips the staging step.

Concretely:

- Add an action **Show Archived Tasks** that swaps the list to a separate, read-only view of `done.txt`.
- Add a per-task action **Unarchive** in that view that moves the task back to `todo.txt`, preserving its completed state.

## Non-goals

- **No bulk unarchive.** One task at a time.
- **No edit / delete / priority / toggle-complete in archive view.** Unarchive is the only mutation. To edit or revive a task fully, unarchive it first, then operate on it in the active list.
- **No `done.txt` watcher.** It is a write-mostly file. We invalidate our in-memory cache when *we* write to it, and accept that external edits won't be picked up until the next manual reload (toggle out and back in).
- **No new preference.** No `showArchivedByDefault`, no `archivePath` rename, no toggle persistence across launches — archive view is always entered explicitly and exited on close.
- **No rename of `done.txt`.** It is the de facto standard filename across todo.txt clients (todo.sh, SwiftoDo, Topydo, SimpleTask, Todour); renaming would break interop. The `donePath` preference already lets individual users override.
- **No new domain mutator.** Unarchive uses the existing serialized task `raw` line verbatim — it does not call `uncomplete()`.
- **No archive presets / date filters / sort modes.** Archive view sorts by completion date desc and otherwise behaves like a plain list. Tag filters still work.

## Design

### UX

A new action **Show Archived Tasks** lives in the action panel alongside the existing **Show Completed Tasks** toggle. Suggested shortcut: `⌘⇧H` (mnemonic: history). Note that `⌘⇧A` is already taken by **Archive Completed**.

When activated:

- The list data source swaps from `todo.txt` to `done.txt`.
- Tasks are shown sorted by **completion date desc** (most recently archived first). Tasks without a completion date sort last by `lineNumber` ascending.
- Search bar placeholder reads `Search archived tasks`.
- The preset dropdown (`searchBarAccessory`) is hidden — presets like "Today" do not apply to history.
- Tag filters continue to work.
- Empty state: if `done.txt` is missing or has zero tasks, show a `List.EmptyView` with title "No archived tasks" and a hint that completed tasks land here via the **Archive Completed** action.

Each archived task exposes a reduced action set:

- **Unarchive** (primary)
- **Show Active Tasks** (exits archive view, restoring the prior `preset`)
- **Open Preferences** — already in the global action panel, unchanged

All other actions from the active view — toggle complete, edit, set priority, bump priority, set due, delete, archive completed, new task — are **not** rendered in archive view.

### State (`tasks.tsx`)

Three additions:

```ts
type ArchiveStatus =
  | { kind: "idle" }                        // not loaded yet
  | { kind: "loading" }
  | { kind: "ready"; snapshot: FileSnapshot }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>({ kind: "idle" });
const [viewMode, setViewMode] = useState<"active" | "archived">("active");
```

`status` (existing) continues to hold the `todo.txt` snapshot. `preset` (existing) is only consulted when `viewMode === "active"`.

### Lazy load and invalidation

`done.txt` loads lazily. The first time the user toggles into archive view, we call `read(prefs.donePath)` and cache the result in `archiveStatus`. Subsequent toggles reuse the cache.

The cache is invalidated (set back to `{ kind: "idle" }`) at every point where *our* code writes to `done.txt`:

1. `archiveCompleted()` — the existing bulk action.
2. The complete-with-`archiveOnComplete` branch in the toggle handler in `tasks.tsx` (currently around line 391–397).
3. `unarchive()` — itself updates `archiveStatus` in memory after a successful write, so it doesn't need to set `idle`; it directly sets the post-write snapshot.

External edits to `done.txt` (user opens it in another editor) are *not* picked up automatically. To see them, the user toggles archive view off and on.

### Unarchive semantics

Unarchive moves a task from `done.txt` to `todo.txt` **as-is** — the `x` prefix and completion date are preserved. The unarchived task lands in the active list as a completed task and shows up in the **Completed** preset. From there, the user can uncomplete it (existing toggle), leave it, or re-archive it via **Archive Completed**.

No `restore()` or `uncomplete()` call is involved. The task's `raw` line is appended verbatim.

This mirrors the existing forward flow:

- Complete: add `x` prefix in place (in `todo.txt`).
- Archive: move `x`-prefixed line from `todo.txt` to `done.txt`.

Reversed:

- Unarchive: move line from `done.txt` to `todo.txt` (still `x`-prefixed).
- Uncomplete (existing): remove `x` prefix in place (in `todo.txt`).

### Atomicity

Unarchive touches two files. The writes cannot be a single atomic operation, so the order matters.

**Write `todo.txt` first, then `done.txt`.**

Reasoning: if the second write fails, the user ends up with a **duplicate** (task in both files). If we wrote in the other order and the second write failed, we'd have a **lost** task (gone from both). A duplicate is recoverable — the user can see it and remove one manually. A loss is silent.

Flow:

1. Call `writeAtomic` on `todo.txt` with `[...currentTasks, { ...task, lineNumber: currentTasks.length }]`.
   - If `kind === "conflict"`: re-read via the returned `fresh` snapshot, retry once. If the retry also conflicts, show a failure toast (`Couldn't unarchive — todo.txt changed, try again`) and **do not touch** `done.txt`. The user's archive view is unchanged; they can retry.
   - If `kind === "ok"`: continue.
2. Call `writeAtomic` on `done.txt` with the archive snapshot minus the matched task.
   - Matching uses `t.raw === task.raw && t.lineNumber === task.lineNumber`, same pattern as the existing `deleteTask` in `tasks.tsx`.
   - If `kind === "conflict"`: re-read via the returned `fresh` snapshot, re-find the task by `raw` + `lineNumber`, retry once. If the task is no longer present in the fresh snapshot, treat it as a no-op success (someone else removed it). If the retry write also conflicts, show a partial-success toast (`Unarchived, but done.txt couldn't be updated — task may appear twice`).
   - If `kind === "ok"`: update both `status` and `archiveStatus` in memory from the returned snapshots.
3. On full success, show a single toast: `Unarchived "<truncated description>"`.

### Domain layer

No new module. `done.txt` is a plain todo.txt-format file; the existing `parser`, `serializeTask`, `read()`, and `writeAtomic()` all work on it as-is. The archive view's sort uses a small inline comparator on `completionDate` (desc, then `lineNumber` asc) — it does not belong in `sections.ts` because archive view does not bucket.

### What does not change

- `src/domain/preset.ts` — presets are an active-view concept.
- `src/domain/sections.ts` and `src/domain/sort.ts` — archive view uses its own inline sort.
- The `todo.txt` watcher and its debounce.
- `src/io/todoFile.ts` — `read()` and `writeAtomic()` already accept any path.
- `package.json` preferences — no new prefs.
- `src/menu-bar.tsx` — menu bar continues to show active tasks only.
- `src/tools/*` — AI tools layer is untouched. (Future: a `restore-task` tool could mirror this UI action, but it is out of scope here.)

## Open considerations

- **Auto-archive + archive view interaction.** With `archiveOnComplete` on, completing a task immediately appends to `done.txt` and removes it from `todo.txt`. The next time the user enters archive view, the just-completed task should appear at the top (sorted by completion date desc). Verify this works given the invalidation rule above.

## Testing

- **Domain:** no new domain code, no new unit tests.
- **IO:** `read()` against a `done.txt` fixture is already covered by `todoFile.test.ts` style patterns; add coverage if the existing tests do not exercise reading a separate path.
- **Atomicity:** add a `todoFile.test.ts` case that exercises a two-file write where the second write hits a conflict, asserting the first file is left in its written state and the function surfaces the partial-success signal up to the caller. (The two-file orchestration lives in `tasks.tsx`, but the building blocks are in `io/`.)
- **UI:** not unit-tested per the project's testing scope (`src/domain/**` and `src/io/**` only). Manual verification via `npm run dev` covers the archive view toggle, unarchive, and empty state.
