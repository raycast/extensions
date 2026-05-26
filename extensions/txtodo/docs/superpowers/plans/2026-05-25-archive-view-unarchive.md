# Archive View and Unarchive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Show Archived Tasks action that swaps the list to a read-only view of `done.txt`, plus a per-task Unarchive that moves a task back to `todo.txt` preserving its completed state.

**Architecture:** All changes are confined to `src/tasks.tsx` (UI state, archive rendering, two-file orchestration) and one new test in `src/io/todoFile.test.ts` (independence of writes across files). No domain code, no new IO functions, no new preferences.

**Tech Stack:** React 19 + Raycast `@raycast/api`, Vitest, Biome. Filesystem reads/writes via the existing `src/io/todoFile.ts` (`read`, `writeAtomic`, `appendToDone`).

**Spec:** `docs/superpowers/specs/2026-05-25-archive-view-unarchive-design.md`

---

## File structure

- **Modify:** `src/tasks.tsx` — add `ArchiveStatus` + `viewMode` state, lazy `done.txt` load, archive render path, `ArchivedTaskItem` component, `unarchive()` function, cache-invalidation hooks in three existing write paths, and a new "Show Archived Tasks" action in three places (TaskItem action panel, the "No tasks yet" empty view, the filter-empty view).
- **Modify:** `src/io/todoFile.test.ts` — add one independence test.

No other files change.

---

## Task 1: Add archive-view state and the toggle action (placeholder render)

Adds the state machine and the action that flips it. Archive view renders a placeholder so we can verify the toggle works before wiring real data.

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add `ArchiveStatus` type and `viewMode` state**

Insert the type alias just below the existing `Status` type alias (currently `tasks.tsx:46-49`). Add two `useState` hooks alongside the existing ones inside `Tasks` (currently `tasks.tsx:58-67`).

After the existing `type Status = …` block at `tasks.tsx:46-49`, add:

```ts
type ArchiveStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; snapshot: FileSnapshot }
  | { kind: "notfound" }
  | { kind: "error"; message: string };
```

Inside `Tasks`, immediately after `const [groupMode, setGroupMode] = useState<GroupMode>("date");` (currently `tasks.tsx:67`), add:

```ts
const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>({ kind: "idle" });
const [viewMode, setViewMode] = useState<"active" | "archived">("active");
```

- [ ] **Step 2: Add the toggle handler**

Inside `Tasks`, just after the new state hooks (immediately below the `setViewMode` line you added), add:

```ts
function showArchive() {
  setViewMode("archived");
}

function showActive() {
  setViewMode("active");
}
```

- [ ] **Step 3: Add a placeholder archive render branch**

Insert this block immediately above the existing `if (status.kind === "loading") return <List isLoading … />` line (currently `tasks.tsx:256`):

```tsx
if (viewMode === "archived") {
  return (
    <List searchBarPlaceholder="Search archived tasks">
      <List.EmptyView
        title="Archive view (coming online)"
        description="Placeholder — wiring up in Task 2."
        icon={Icon.SaveDocument}
        actions={
          <ActionPanel>
            <Action
              title="Show Active Tasks"
              icon={Icon.List}
              onAction={showActive}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

- [ ] **Step 4: Add a "Show Archived Tasks" action to `TaskItem`**

Add an `onShowArchived: () => void` prop to `TaskItem`. Two changes: extend the prop list (currently `tasks.tsx:563-587` for the destructure, `tasks.tsx:587-611` for the type). Add a new `<Action>` inside the trailing `<ActionPanel.Section>` (currently `tasks.tsx:748-784`), placed immediately after the existing "Show Completed Tasks" action (line 778-783).

In the destructured props block at `tasks.tsx:563-587`, add `onShowArchived,` at the end of the list (before the closing `}`).

In the prop-type block at `tasks.tsx:587-611`, add right before the closing `}`:

```ts
onShowArchived: () => void;
```

In the action panel section near `tasks.tsx:778-783`, immediately after the closing `/>` of the "Show Completed Tasks" action, add:

```tsx
<Action
  title="Show Archived Tasks"
  icon={Icon.SaveDocument}
  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
  onAction={onShowArchived}
/>
```

- [ ] **Step 5: Pass `onShowArchived` from both `TaskItem` call sites**

`TaskItem` is rendered in two places: the date-section path (`tasks.tsx:308-362`) and the priority-section path (`tasks.tsx:488-543`). Both already pass many props. Add `onShowArchived={showArchive}` to both — alphabetical-ish positioning isn't enforced; place it next to the existing `onToggleCompletedView` for consistency.

In both call sites, add (next to the `onToggleCompletedView={...}` line):

```tsx
onShowArchived={showArchive}
```

- [ ] **Step 6: Type-check**

Run:
```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Run the lint check**

Run:
```
npm run lint
```

Expected: zero errors.

- [ ] **Step 8: Manual verify**

Run `npm run dev`. Open Show Tasks. Press `⌘⇧H`. The list should switch to the "Archive view (coming online)" placeholder. From the placeholder, hit Enter on "Show Active Tasks" — it returns to the normal active view.

- [ ] **Step 9: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(tasks): add archive view toggle with placeholder render"
```

---

## Task 2: Lazy-load `done.txt` on first toggle into archive view

Replaces the placeholder with an actual read of `done.txt`. Renders a raw list (without the polished item rendering yet — that comes in Task 3).

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add the lazy-load effect**

Inside `Tasks`, just below the existing `useEffect` that loads `todo.txt` (currently ends at `tasks.tsx:254`), add a new effect that triggers a `done.txt` read when entering archive view if the status is `idle`:

```ts
useEffect(() => {
  if (viewMode !== "archived") return;
  if (archiveStatus.kind !== "idle") return;
  let cancelled = false;
  setArchiveStatus({ kind: "loading" });
  void (async () => {
    try {
      const result = await read(prefs.donePath);
      if (cancelled) return;
      setArchiveStatus(
        result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result },
      );
    } catch (err) {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : String(err);
      setArchiveStatus({ kind: "error", message });
    }
  })();
  return () => {
    cancelled = true;
  };
}, [viewMode, archiveStatus.kind, prefs.donePath]);
```

- [ ] **Step 2: Replace the placeholder archive render with real branches**

Replace the entire `if (viewMode === "archived") { … }` block you added in Task 1, Step 3 with the following — covers loading, error, notfound, empty-ready, and ready-with-tasks. The ready-with-tasks branch renders a minimal `List.Item` per archived task; we'll upgrade to `ArchivedTaskItem` in Task 3.

```tsx
if (viewMode === "archived") {
  if (archiveStatus.kind === "loading" || archiveStatus.kind === "idle") {
    return <List isLoading searchBarPlaceholder="Loading archive…" />;
  }

  if (archiveStatus.kind === "error") {
    return (
      <List searchBarPlaceholder="Search archived tasks">
        <List.EmptyView
          title="Couldn't read done.txt"
          description={archiveStatus.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Show Active Tasks" icon={Icon.List} onAction={showActive} />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (archiveStatus.kind === "notfound" || archiveStatus.snapshot.tasks.length === 0) {
    return (
      <List searchBarPlaceholder="Search archived tasks">
        <List.EmptyView
          title="No archived tasks"
          description="Completed tasks land here when you run Archive Completed."
          icon={Icon.SaveDocument}
          actions={
            <ActionPanel>
              <Action title="Show Active Tasks" icon={Icon.List} onAction={showActive} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search archived tasks">
      {archiveStatus.snapshot.tasks.map((task) => (
        <List.Item
          key={`arch-${task.lineNumber}-${task.raw}`}
          title={`✓ ${stripMetadataFromDescription(task.description)}`}
          actions={
            <ActionPanel>
              <Action title="Show Active Tasks" icon={Icon.List} onAction={showActive} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Manual verify**

Run `npm run dev`. Make sure your `~/done.txt` has at least one line (e.g., `x 2026-05-24 sample archived task`). Press `⌘⇧H`. You should see the archived task(s) listed. With an empty/missing `done.txt`, the empty state should render.

- [ ] **Step 5: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(tasks): lazy-load done.txt when archive view opens"
```

---

## Task 3: Polished archive rendering with sort, tag filter, and `ArchivedTaskItem`

Adds proper sort (by completion date desc, then lineNumber asc), tag-filter pass-through, and a dedicated `ArchivedTaskItem` component. Unarchive is wired as a stub here; real implementation is Task 4.

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add the archive sort comparator**

Add this helper at module scope, near the existing `today()` function (currently `tasks.tsx:862-868`):

```ts
function compareArchived(a: Task, b: Task): number {
  const aDate = a.completionDate ?? "";
  const bDate = b.completionDate ?? "";
  if (aDate !== bDate) return aDate < bDate ? 1 : -1; // desc
  return a.lineNumber - b.lineNumber;
}
```

- [ ] **Step 2: Add the `ArchivedTaskItem` component**

Add this component just below the existing `TaskItem` component (currently ends at `tasks.tsx:789`):

```tsx
function ArchivedTaskItem({
  task,
  onUnarchive,
  onShowActive,
}: {
  task: Task;
  onUnarchive: () => Promise<void>;
  onShowActive: () => void;
}) {
  return (
    <List.Item
      title={`✓ ${stripMetadataFromDescription(task.description)}`}
      keywords={[
        ...task.projects,
        ...task.contexts,
        ...task.projects.map((p) => `+${p}`),
        ...task.contexts.map((c) => `@${c}`),
      ]}
      accessories={
        task.completionDate
          ? [{ tag: { value: task.completionDate, color: Color.SecondaryText } }]
          : []
      }
      actions={
        <ActionPanel>
          <Action title="Unarchive" icon={Icon.ArrowCounterClockwise} onAction={onUnarchive} />
          <Action
            title="Show Active Tasks"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            onAction={onShowActive}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 3: Stub an `unarchive` function**

Inside `Tasks`, just below the existing `archiveCompleted` function (currently `tasks.tsx:138-153`), add a stub that we'll fill in in Task 4:

```ts
async function unarchive(task: Task) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Unarchive not yet wired (Task 4)",
  });
  // Suppress unused-arg lint while stubbed.
  void task;
}
```

- [ ] **Step 4: Replace the raw archive list with sorted, filtered `ArchivedTaskItem`s**

In the archive render branch (the final `return` block of the `if (viewMode === "archived") { … }`), replace the `<List … >{archiveStatus.snapshot.tasks.map(…)}</List>` with the sorted/filtered version.

First, just above that `return`, derive the visible archived tasks:

```ts
const archivedVisible = archiveStatus.snapshot.tasks
  .filter((t) => matchesFilters(t, tagFilters))
  .sort(compareArchived);
```

Then replace the `return (…)` block with:

```tsx
return (
  <List searchBarPlaceholder="Search archived tasks">
    {archivedVisible.length === 0 ? (
      <List.EmptyView
        title="No archived tasks match"
        description="Clear tag filters or switch back to active."
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action title="Show Active Tasks" icon={Icon.List} onAction={showActive} />
            {tagFilters.length > 0 && (
              <Action
                title="Clear Tag Filters"
                icon={Icon.Trash}
                onAction={clearTagFilters}
              />
            )}
          </ActionPanel>
        }
      />
    ) : (
      <List.Section
        title="Archived"
        subtitle={`${archivedVisible.length} task${archivedVisible.length === 1 ? "" : "s"}`}
      >
        {archivedVisible.map((task) => (
          <ArchivedTaskItem
            key={`arch-${task.lineNumber}-${task.raw}`}
            task={task}
            onUnarchive={() => unarchive(task)}
            onShowActive={showActive}
          />
        ))}
      </List.Section>
    )}
  </List>
);
```

- [ ] **Step 5: Type-check and lint**

Run:
```
npx tsc --noEmit && npm run lint
```

Expected: zero errors.

- [ ] **Step 6: Manual verify**

Run `npm run dev`. Put two lines in `~/done.txt`:

```
x 2026-05-20 first archived +health
x 2026-05-24 second archived +work
```

Press `⌘⇧H`. Both tasks should appear, sorted with the 2026-05-24 task first. Tag filters from active view should still apply — toggle a `+work` filter in active view, then enter archive view, and only `second archived` should be visible.

Triggering "Unarchive" on an item should produce the placeholder failure toast.

- [ ] **Step 7: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(tasks): render archived tasks with sort and tag filter"
```

---

## Task 4: Implement the two-file unarchive

Replaces the stub with the real two-file write. Atomic per file via existing `writeAtomic`; sequential across files with retry-once-on-conflict and a clear failure-mode toast.

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Replace the `unarchive` stub with the real implementation**

Replace the stub `unarchive` function (added in Task 3 Step 3) with:

```ts
async function unarchive(task: Task) {
  if (status.kind !== "ready") return;
  if (archiveStatus.kind !== "ready") return;

  const truncated =
    task.description.length > 40 ? `${task.description.slice(0, 40)}…` : task.description;

  // --- Write 1: append to todo.txt, retry once on conflict.
  let activeAfter = status.snapshot;
  {
    const next = [
      ...status.snapshot.tasks,
      { ...task, lineNumber: status.snapshot.tasks.length },
    ];
    const first = await writeAtomic(status.snapshot, next);
    if (first.kind === "ok") {
      activeAfter = first.snapshot;
    } else {
      const retryNext = [
        ...first.fresh.tasks,
        { ...task, lineNumber: first.fresh.tasks.length },
      ];
      const retry = await writeAtomic(first.fresh, retryNext);
      if (retry.kind !== "ok") {
        setStatus({ kind: "ready", snapshot: retry.fresh });
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't unarchive — todo.txt changed, try again",
        });
        return;
      }
      activeAfter = retry.snapshot;
    }
  }
  setStatus({ kind: "ready", snapshot: activeAfter });

  // --- Write 2: remove from done.txt, retry once on conflict.
  const removeMatch = (t: Task) => !(t.raw === task.raw && t.lineNumber === task.lineNumber);
  let archiveAfter = archiveStatus.snapshot;
  {
    const next = archiveStatus.snapshot.tasks.filter(removeMatch);
    const first = await writeAtomic(archiveStatus.snapshot, next);
    if (first.kind === "ok") {
      archiveAfter = first.snapshot;
    } else {
      const freshHasIt = first.fresh.tasks.some(
        (t) => t.raw === task.raw && t.lineNumber === task.lineNumber,
      );
      if (!freshHasIt) {
        archiveAfter = first.fresh;
      } else {
        const retryNext = first.fresh.tasks.filter(removeMatch);
        const retry = await writeAtomic(first.fresh, retryNext);
        if (retry.kind !== "ok") {
          setArchiveStatus({ kind: "ready", snapshot: retry.fresh });
          await showToast({
            style: Toast.Style.Failure,
            title: "Unarchived, but done.txt couldn't be updated — task may appear twice",
          });
          return;
        }
        archiveAfter = retry.snapshot;
      }
    }
  }
  setArchiveStatus({ kind: "ready", snapshot: archiveAfter });

  await showToast({
    style: Toast.Style.Success,
    title: `Unarchived "${truncated}"`,
  });
}
```

- [ ] **Step 2: Type-check and lint**

Run:
```
npx tsc --noEmit && npm run lint
```

Expected: zero errors.

- [ ] **Step 3: Manual verify — happy path**

Run `npm run dev`. With `~/done.txt` containing at least one `x`-prefixed task, press `⌘⇧H`, then trigger "Unarchive" on an item.

Expected: success toast `Unarchived "<truncated description>"`. The task disappears from the archive view immediately. Exit archive (`⌘⇧H` again or Show Active Tasks), switch the preset dropdown to "Completed". The task should appear there with its `x` prefix and completion date preserved. Open `~/todo.txt` in a text editor and confirm the `x`-prefixed line was appended at the end.

- [ ] **Step 4: Manual verify — round-trip**

From the "Completed" preset, run "Archive Completed" (`⌘⇧A`) on the same task. It should disappear from active view. Re-enter archive view — it should reappear (the cache invalidation that confirms this lives in Task 5; if this step fails today, Task 5 will fix it).

- [ ] **Step 5: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(tasks): implement two-file unarchive with retry"
```

---

## Task 5: Invalidate the archive cache after our own writes to `done.txt`

After `archiveCompleted` or the `archiveOnComplete` complete-handler branch writes to `done.txt`, the cached `archiveStatus` is stale. Set it back to `idle` so the next archive-view entry re-reads.

`unarchive()` already updates `archiveStatus` directly from `writeAtomic`'s returned snapshot, so it does not need invalidation.

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Invalidate after `archiveCompleted`**

In the existing `archiveCompleted` function (currently `tasks.tsx:138-153`), add a final line after the `await applyMutation(...)` call:

Locate this block:

```ts
async function archiveCompleted() {
  if (status.kind !== "ready") return;
  const completedTasks = status.snapshot.tasks.filter((t) => t.completed);
  if (completedTasks.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to archive",
    });
    return;
  }
  await appendToDone(prefs.donePath, completedTasks);
  await applyMutation(
    (tasks) => tasks.filter((t) => !t.completed),
    `Archived ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"}`,
  );
}
```

Change it to:

```ts
async function archiveCompleted() {
  if (status.kind !== "ready") return;
  const completedTasks = status.snapshot.tasks.filter((t) => t.completed);
  if (completedTasks.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to archive",
    });
    return;
  }
  await appendToDone(prefs.donePath, completedTasks);
  await applyMutation(
    (tasks) => tasks.filter((t) => !t.completed),
    `Archived ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"}`,
  );
  setArchiveStatus({ kind: "idle" });
}
```

- [ ] **Step 2: Invalidate inside the date-section toggle (archiveOnComplete branch)**

In the date-section render path (currently `tasks.tsx:313-333`), the `onToggle` for each `TaskItem` has the `archiveOnComplete` branch. The current shape is:

```ts
if (!target.completed && prefs.archiveOnComplete) {
  void appendToDone(prefs.donePath, [toggled]);
  return [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
}
```

Change the body to:

```ts
if (!target.completed && prefs.archiveOnComplete) {
  void appendToDone(prefs.donePath, [toggled]);
  setArchiveStatus({ kind: "idle" });
  return [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
}
```

Note: `setArchiveStatus` is safe to call inside the `applyMutation` transform — React will batch it with the existing `setStatus` from `applyMutation`'s success path.

- [ ] **Step 3: Invalidate inside the priority-section toggle (archiveOnComplete branch)**

In the priority-section render path (currently `tasks.tsx:493-513`), apply the exact same change as Step 2:

```ts
if (!target.completed && prefs.archiveOnComplete) {
  void appendToDone(prefs.donePath, [toggled]);
  setArchiveStatus({ kind: "idle" });
  return [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
}
```

- [ ] **Step 4: Type-check and lint**

Run:
```
npx tsc --noEmit && npm run lint
```

Expected: zero errors.

- [ ] **Step 5: Manual verify — Archive Completed invalidation**

Run `npm run dev`. Create a task, mark it complete (don't archive yet). Open archive view (`⌘⇧H`) and exit — to populate the cache. Now run "Archive Completed" (`⌘⇧A`) from active view. Re-enter archive view: the just-archived task should appear at the top, sorted by completion date desc.

- [ ] **Step 6: Manual verify — archiveOnComplete invalidation**

Enable the `archiveOnComplete` preference (Raycast preferences → TXTodo → Auto-archive on complete). Create a new task. Open archive view to populate the cache; exit. Complete the task from active view (it goes straight to `done.txt`). Re-enter archive view: the task should appear.

- [ ] **Step 7: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(tasks): invalidate archive cache after done.txt writes"
```

---

## Task 6: Add an IO test demonstrating cross-file write independence

Documents the invariant that backs the unarchive failure mode: if we write file A successfully and the subsequent write to file B conflicts, A is in its post-write state. (We do not roll back A.)

**Files:**
- Modify: `src/io/todoFile.test.ts`

- [ ] **Step 1: Add the test**

Append the following `describe` block to the end of `src/io/todoFile.test.ts`:

```ts
describe("writeAtomic — cross-file independence", () => {
  it("a conflict on file B leaves file A in its written state", async () => {
    const aPath = join(dir, "todo.txt");
    const bPath = join(dir, "done.txt");
    await writeFile(aPath, "(A) one\n");
    await writeFile(bPath, "x 2026-05-20 archived\n");

    const snapA = await read(aPath);
    const snapB = await read(bPath);
    if (snapA === "notfound" || snapB === "notfound") throw new Error("expected snapshots");

    const resultA = await writeAtomic(snapA, [parseLine("(A) one", 0), parseLine("(B) two", 1)]);
    expect(resultA.kind).toBe("ok");

    await new Promise((r) => setTimeout(r, 15));
    await writeFile(bPath, "x 2026-05-20 archived\nx 2026-05-21 external edit\n");

    const resultB = await writeAtomic(snapB, []);
    expect(resultB.kind).toBe("conflict");

    const finalA = await read(aPath);
    if (finalA === "notfound") throw new Error("expected snapshot");
    expect(finalA.raw).toBe("(A) one\n(B) two\n");
  });
});
```

- [ ] **Step 2: Run the new test**

Run:
```
npm test -- src/io/todoFile.test.ts
```

Expected: all tests pass, including the new "a conflict on file B leaves file A in its written state".

- [ ] **Step 3: Run the full test suite**

Run:
```
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Final lint and type-check**

Run:
```
npm run lint && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/io/todoFile.test.ts
git commit -m "test(io): document cross-file write independence for unarchive"
```

---

## Self-review notes

**Spec coverage:**
- "Show Archived Tasks" action with `⌘⇧H` → Task 1 (placeholder), refined in Tasks 2–3.
- Lazy load + invalidation on `done.txt` writes → Task 2 (load), Task 5 (invalidation).
- Sort by completion date desc, then lineNumber asc → Task 3 (`compareArchived`).
- Hide preset dropdown in archive view → satisfied implicitly because the archive render returns early before the active-view `<List … searchBarAccessory={…}>` is reached.
- Tag filters still apply in archive view → Task 3 (`matchesFilters(t, tagFilters)`).
- Empty-state messaging → Task 2 (notfound), Task 3 (notfound-after-filter).
- Reduced archive action set (Unarchive / Show Active / Open Preferences) → Task 3 (`ArchivedTaskItem`).
- Unarchive preserves `x` and completion date → Task 4 (`{ ...task, lineNumber: … }` — no mutator applied).
- todo.txt-first, then done.txt write order with retry-once → Task 4.
- Three failure messages (todo.txt conflict twice, done.txt partial, full success) → Task 4.
- Cross-file independence test → Task 6.

**Type / signature consistency:** `ArchiveStatus`, `viewMode`, `archiveStatus`, `archiveAfter`, `activeAfter`, `compareArchived`, `unarchive`, `showArchive`, `showActive`, `onShowArchived` are introduced once and used consistently across tasks. `removeMatch` is local to `unarchive`. No clashes with existing names.

**No placeholders remain.** Every step contains exact code, exact commands, and exact expected output.

**Manual-verification only for UI:** per CLAUDE.md, UI files are not unit-tested. Tasks 1–5 lean on `npm run dev` checks. Task 6 covers the IO-layer invariant under the unit-test suite.
