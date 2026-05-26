# Actions Menu Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim the per-task `ActionPanel` in `src/tasks.tsx` from 17 → 11 actions, promote `Show Completed Tasks` and `Show Archived Tasks` to top-level Raycast commands, re-section the panel as Primary / Filters / View utilities, drop the "Show Active Tasks" toggles from every empty-state and the archive view, retint the active-filter list icon from `Color.Blue` to `Color.SecondaryText`.

**Architecture:** `tasks.tsx` currently exports a single 1100-line `Tasks` component that reads its preset from Raycast `LaunchProps` and manages `viewMode: "active" | "archived"` internally. We extract a named `TasksView` component that accepts `initialPreset` and `initialView` props; the existing default export becomes a thin shell that translates `LaunchProps`. Two new entry files (`show-completed.tsx`, `show-archived.tsx`) import `TasksView` directly and pass the right seed props.

**Tech Stack:** TypeScript, React, `@raycast/api`, Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-05-25-actions-menu-cleanup-design.md`

---

## Conventions for every task

- Run `npm run lint` and `npx tsc --noEmit` after each task; both must pass.
- Run `npm test` after each task; the domain/io suites must stay green (no UI tests exist).
- UI verification is manual: run `npm run dev` (Raycast must be installed) and exercise the affected paths in the Raycast root.
- Commit at the end of each task. Use the `feat`, `refactor`, `chore`, or `style` prefix as indicated.

## Preflight

- [ ] **Confirm a clean tree.**

Run: `git status`
Expected: working tree clean.

- [ ] **Create a feature branch off `main`.**

Run:
```bash
git checkout -b feature/actions-menu-cleanup
git status
```
Expected: `On branch feature/actions-menu-cleanup`, working tree clean.

---

## Task 1: Extract `TasksView` from `Tasks`

This is a **mechanical refactor**. The behaviour of the existing `tasks` command must be unchanged after this commit. Subsequent tasks rely on `TasksView` accepting `initialPreset` / `initialView` props so the two new commands can seed it.

**Files:**
- Modify: `src/tasks.tsx` (around lines 58–66 and through the end of the existing `Tasks` body)

- [ ] **Step 1: Read the current entry function.**

Open `src/tasks.tsx`. The current default export is:

```tsx
type Arguments = { preset?: string };

export default function Tasks(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = useMemo(getPreferences, []);
  const argPreset = props.arguments.preset;
  const initialPreset: ViewPreset = isValidPreset(argPreset) ? argPreset : "all";

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [preset, setPreset] = useState<ViewPreset>(initialPreset);
  ...
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  ...
}
```

`viewMode` is also seeded inside the body. We need both seeds to come from props.

- [ ] **Step 2: Split into a shell and a `TasksView` component.**

Replace the existing `export default function Tasks(...)` block with two functions. Keep all internal logic (the rest of the function body) inside `TasksView` exactly as it is today — only the seed lines change:

```tsx
type Arguments = { preset?: string };

export default function Tasks(props: LaunchProps<{ arguments: Arguments }>) {
  const argPreset = props.arguments.preset;
  const initialPreset: ViewPreset = isValidPreset(argPreset) ? argPreset : "all";
  return <TasksView initialPreset={initialPreset} />;
}

export function TasksView({
  initialPreset = "all",
  initialView = "active",
}: {
  initialPreset?: ViewPreset;
  initialView?: "active" | "archived";
}) {
  const prefs = useMemo(getPreferences, []);

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [preset, setPreset] = useState<ViewPreset>(initialPreset);
  // Raycast's List.Dropdown fires a spurious onChange with the first child's value
  // on mount, overwriting the controlled `value`. Swallow that one event so the
  // preset argument from the root search is honored.
  const skipNextDropdownChange = useRef(true);
  const [tagFilters, setTagFilters] = useState<TagFilter[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const toggleDetail = () => setShowDetail((v) => !v);
  const [groupMode, setGroupMode] = useState<GroupMode>("date");
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>({ kind: "idle" });
  const [viewMode, setViewMode] = useState<"active" | "archived">(initialView);

  // ... ALL OF THE EXISTING TASKS BODY STAYS HERE EXACTLY AS WRITTEN ...
}
```

Concretely: cut everything from `const prefs = useMemo(getPreferences, []);` through the closing brace of the current `Tasks` function and paste it inside `TasksView`. Change only the two highlighted seed lines:

- `useState<ViewPreset>(initialPreset)` — `initialPreset` now comes from props rather than from the local `argPreset` computation.
- `useState<"active" | "archived">(initialView)` — was `"active"`.

Delete the old `const argPreset = props.arguments.preset;` and `const initialPreset: ViewPreset = isValidPreset(argPreset) ? argPreset : "all";` lines from `TasksView` (those live in the shell now).

- [ ] **Step 3: Type-check, lint, test.**

Run:
```bash
npx tsc --noEmit
npm run lint
npm test
```
Expected: all pass.

- [ ] **Step 4: Manual smoke test.**

Run `npm run dev`. In Raycast, launch **Show Tasks**, then **Show Tasks** with the `Completed` preset arg. Both should behave exactly as before. Confirm:
- The active list renders.
- Picking `Completed` from the dropdown arg routes to the completed view.
- Archive toggle (still present from the per-task panel) still works.

- [ ] **Step 5: Commit.**

```bash
git add src/tasks.tsx
git commit -m "refactor(tasks): extract TasksView with initialPreset/initialView props"
```

---

## Task 2: Add `show-completed` and `show-archived` commands

**Files:**
- Modify: `package.json`
- Create: `src/show-completed.tsx`
- Create: `src/show-archived.tsx`

- [ ] **Step 1: Add the two `commands` entries to `package.json`.**

Insert these two objects into the `commands` array, after the existing `quick-add` entry and before `menu-bar`:

```json
{
  "name": "show-completed",
  "title": "Show Completed Tasks",
  "description": "View completed tasks still in todo.txt",
  "mode": "view"
},
{
  "name": "show-archived",
  "title": "Show Archived Tasks",
  "description": "View tasks archived to done.txt",
  "mode": "view"
},
```

Make sure the surrounding commas are correct (no trailing comma after the last entry).

- [ ] **Step 2: Create `src/show-completed.tsx`.**

```tsx
import { TasksView } from "./tasks";

export default function ShowCompleted() {
  return <TasksView initialPreset="completed" />;
}
```

- [ ] **Step 3: Create `src/show-archived.tsx`.**

```tsx
import { TasksView } from "./tasks";

export default function ShowArchived() {
  return <TasksView initialView="archived" />;
}
```

- [ ] **Step 4: Type-check, lint, test.**

Run:
```bash
npx tsc --noEmit
npm run lint
npm test
```
Expected: all pass. If lint flags `package.json` for reflowed `categories` / `platforms` arrays (CLAUDE.md warns about this), re-collapse them onto one line and re-run.

- [ ] **Step 5: Manual smoke test.**

Run `npm run dev`. In Raycast root, you should now see:
- Show Tasks (existing)
- Add Task (existing)
- Show Completed Tasks (new — opens completed view directly)
- Show Archived Tasks (new — opens archive view directly)
- Refresh Menu Bar / Toggle Menu Bar (existing)

Launch **Show Completed Tasks** → list shows only completed tasks. Launch **Show Archived Tasks** → archive view loads `done.txt`. Confirm both work.

- [ ] **Step 6: Commit.**

```bash
git add package.json src/show-completed.tsx src/show-archived.tsx
git commit -m "feat(commands): add Show Completed and Show Archived as root commands"
```

---

## Task 3: Trim the per-task action panel and re-section into Primary / Filters / View utilities

This is the central UX cleanup. Drops six actions, removes their handler props, deletes the `quicklinkForPreset` helper, and wraps the remaining 11 actions in three explicit `ActionPanel.Section` blocks.

**Files:**
- Modify: `src/tasks.tsx`

Sections affected: the per-task `ActionPanel` inside the `TaskItem` component (currently lines ~838–991 in the pre-refactor code, slightly shifted post-Task-1), the helper `quicklinkForPreset` (~749–757), the `bumpPriorityUp` / `bumpPriorityDown` mutators if they exist in the parent, and the `showArchive` call sites.

- [ ] **Step 1: Locate and confirm the per-task panel.**

Run:
```bash
grep -n "Complete Task\|Mark Incomplete" src/tasks.tsx
```
Expected: matches inside the `TaskItem` component (the per-active-task panel) and possibly a comment. The relevant `ActionPanel` is the one whose first child renders `task.completed ? "Mark Incomplete" : "Complete Task"`.

- [ ] **Step 2: Replace the per-task `ActionPanel` body with the new shape.**

Replace the entire `<ActionPanel>...</ActionPanel>` block in the active task item with:

```tsx
<ActionPanel>
  <ActionPanel.Section>
    <Action
      title={task.completed ? "Mark Incomplete" : "Complete Task"}
      onAction={onToggle}
    />
    <Action.Push
      title="Edit Raw"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={onEdit()}
    />
    <ActionPanel.Submenu
      title="Set Priority"
      icon={Icon.Star}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
    >
      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
        <Action
          key={letter}
          title={letter}
          onAction={() => onSetPriority(letter as Priority)}
        />
      ))}
      <Action title="Clear priority" onAction={() => onSetPriority(undefined)} />
    </ActionPanel.Submenu>
    <Action
      title="Delete Task"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={onDelete}
    />
    <Action
      title="Archive Completed"
      icon={Icon.SaveDocument}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={onArchiveCompleted}
    />
  </ActionPanel.Section>

  <ActionPanel.Section>
    {(task.projects.length > 0 || task.contexts.length > 0) && (
      <ActionPanel.Submenu
        title="Filter by Tag"
        icon={Icon.Filter}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      >
        {task.projects.map((p) => {
          const f: TagFilter = { kind: "project", name: p };
          const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
          return (
            <Action
              key={`p-${p}`}
              title={active ? `Remove +${p}` : `Add +${p}`}
              onAction={() => onToggleTagFilter(f)}
            />
          );
        })}
        {task.contexts.map((c) => {
          const f: TagFilter = { kind: "context", name: c };
          const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
          return (
            <Action
              key={`c-${c}`}
              title={active ? `Remove @${c}` : `Add @${c}`}
              onAction={() => onToggleTagFilter(f)}
            />
          );
        })}
      </ActionPanel.Submenu>
    )}
    {(allKnownProjects.length > 0 || allKnownContexts.length > 0) && (
      <ActionPanel.Submenu
        title="Add Filter"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      >
        {allKnownProjects.map((p) => {
          const f: TagFilter = { kind: "project", name: p };
          const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
          if (active) return null;
          return (
            <Action key={`gp-${p}`} title={`+${p}`} onAction={() => onToggleTagFilter(f)} />
          );
        })}
        {allKnownContexts.map((c) => {
          const f: TagFilter = { kind: "context", name: c };
          const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
          if (active) return null;
          return (
            <Action key={`gc-${c}`} title={`@${c}`} onAction={() => onToggleTagFilter(f)} />
          );
        })}
      </ActionPanel.Submenu>
    )}
  </ActionPanel.Section>

  <ActionPanel.Section>
    <Action.Open
      title="Open todo.txt"
      target={prefs.todoPath}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
    />
    <Action
      title="Reload"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={onReload}
    />
    <Action
      title={showDetail ? "Hide Detail" : "Show Detail"}
      icon={Icon.AppWindowSidebarRight}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={onToggleDetail}
    />
    <Action
      title={groupMode === "date" ? "Group by Priority" : "Group by Date"}
      icon={groupMode === "date" ? Icon.Star : Icon.Calendar}
      shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
      onAction={onToggleGroupMode}
    />
  </ActionPanel.Section>
</ActionPanel>
```

Note: this drops `Action.Push title="New Task"`, both `Bump Priority` actions, the `Action.CreateQuicklink`, the `Show Completed/Active Tasks` toggle, and the `Show Archived Tasks` action.

- [ ] **Step 3: Remove the now-unused props from the task item component signature.**

Find the component (named `TaskItem` in current code; line ~760). It takes a prop bundle that includes:

```ts
onNew: () => JSX.Element;
onBumpUp: () => void;
onBumpDown: () => void;
onToggleCompletedView: () => void;
onShowArchived: () => void;
```

Delete all five of these from both the destructured parameter list and the type declaration. Verify nothing inside the component still references them (the panel rewrite above already dropped the usages).

- [ ] **Step 4: Remove the props from where the parent renders the item.**

In `TasksView`, find the two `<TaskItem ... />` call sites (one inside the main render around line ~543, one inside the preset-empty-state branch around line ~725). Delete these props from both call sites:

- `onNew={openNew}`
- `onBumpUp={...}` and `onBumpDown={...}` (whichever names the parent uses)
- `onToggleCompletedView={() => setPreset(preset === "completed" ? "all" : "completed")}`
- `onShowArchived={showArchive}`

- [ ] **Step 5: Delete the now-unused parent helpers.**

Inside `TasksView`:

- Delete the entire `showArchive` function (around line 78–80):
  ```tsx
  function showArchive() {
    setViewMode("archived");
  }
  ```
- If the parent defines `bumpPriorityUp` / `bumpPriorityDown` (or similar) wrappers used only by the dropped actions, delete those too. (Grep for their usages first.)

- [ ] **Step 6: Delete the `quicklinkForPreset` helper.**

Remove the entire helper (currently around lines 749–757 pre-refactor):

```tsx
function quicklinkForPreset(preset: ViewPreset): {
  ...
}
```

`PRESET_LABELS` stays — it's still used by `presetLabel`.

- [ ] **Step 7: Type-check, lint, test.**

Run:
```bash
npx tsc --noEmit
npm run lint
npm test
```
Expected: all pass. The compiler will catch any prop you forgot to remove from either the type or a call site.

- [ ] **Step 8: Manual smoke test.**

Run `npm run dev`. Launch **Show Tasks**. Open the action panel on any task. Confirm:
- 11 visible actions total.
- They are grouped into three sections separated by dividers, in order: Complete / Edit Raw / Set Priority / Delete / Archive Completed → Filter by Tag / Add Filter → Open todo.txt / Reload / Show Detail / Group by …
- ⌘E, ⌘P, ⌃X, ⌘⇧A, ⌘F, ⌘⇧F, ⌘O, ⌘R, ⌘D, ⌘⇧G all still work.
- ⌘N, ⌘↑, ⌘↓, ⌘⇧Q, ⌘⇧C, ⌘⇧H **no longer trigger anything**.

- [ ] **Step 9: Commit.**

```bash
git add src/tasks.tsx
git commit -m "feat(tasks): trim per-task panel to 11 actions in 3 sections"
```

---

## Task 4: Drop "Show Active Tasks" from empty states and archive view; add "Open done.txt"

The per-task panel no longer carries cross-scope navigation; this task brings the empty states and the archive view in line with the same principle. It also adds an `Open done.txt` action to the archive view per-task panel for parity with `Open todo.txt`.

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Remove `Show Active Tasks` from the completed-view empty state (`status.kind === "ready"` branch, around line 380 pre-refactor).**

Find the `<List.EmptyView ... title="No completed tasks" ... />` (or similar) inside the completed branch. Its `actions` prop currently contains both `Show Active Tasks` and `Open Preferences`. Replace with only `Open Preferences`:

```tsx
actions={
  <ActionPanel>
    <Action
      title="Open Preferences"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  </ActionPanel>
}
```

- [ ] **Step 2: Remove `Show Active Tasks` from the active-side empty states.**

There are two more `ActionPanel`s with a `Show Active Tasks` action — one around line 402 (`empty completed-no-match`) and one around line 423 (`filtered empty in active`). For each:
- Delete the `<Action title="Show Active Tasks" .../>` line.
- Keep `Clear Tag Filters` where present (that's a within-scope action, not cross-scope).

If an `ActionPanel` becomes empty after this, replace it with `actions={undefined}` on the `List.EmptyView` (Raycast accepts no actions panel just fine).

- [ ] **Step 3: Remove `Show Active Tasks` from the archive-view error empty state (around line 380, archive-side).**

Inside the `if (archiveStatus.kind === "error")` block, drop `Show Active Tasks`. Keep `Open Preferences`.

- [ ] **Step 4: Remove `Show Active Tasks` from the archive-view "no archived tasks" empty state (around line 402, archive-side).**

That `ActionPanel` currently contains only `Show Active Tasks` — delete the whole `actions={…}` prop from the `List.EmptyView`.

- [ ] **Step 5: Remove `Show Active Tasks` and `Clear Tag Filters` toggle is contextual in the archive "no match" empty state (around line 423).**

Drop the `Show Active Tasks` line. Keep `Clear Tag Filters` when `tagFilters.length > 0`.

- [ ] **Step 6: Update the `ArchivedTaskItem` per-task panel.**

Find the `ArchivedTaskItem` component (around line 996). Replace its `<ActionPanel>...</ActionPanel>` with:

```tsx
<ActionPanel>
  <Action title="Unarchive" icon={Icon.ArrowCounterClockwise} onAction={onUnarchive} />
  <Action.Open
    title="Open done.txt"
    target={prefs.donePath}
    shortcut={{ modifiers: ["cmd"], key: "o" }}
  />
  <Action
    title="Open Preferences"
    icon={Icon.Gear}
    onAction={openExtensionPreferences}
  />
</ActionPanel>
```

`ArchivedTaskItem` currently does **not** receive `prefs` (it only takes `task`, `onUnarchive`, `onShowActive`). Add it, matching the active-side pattern where `TaskItem` already takes `prefs: Preferences`:

1. Update the props type and destructured params:

```tsx
function ArchivedTaskItem({
  task,
  onUnarchive,
  prefs,
}: {
  task: Task;
  onUnarchive: () => Promise<void>;
  prefs: Preferences;
}) {
```

2. At the call site (parent map around line 435–442), pass `prefs={prefs}` and drop `onShowActive`:

```tsx
<ArchivedTaskItem
  key={`arch-${task.lineNumber}-${task.raw}`}
  task={task}
  onUnarchive={() => unarchive(task)}
  prefs={prefs}
/>
```

3. Make sure `Preferences` is imported in `tasks.tsx` (it should already be — `TaskItem` uses it).

- [ ] **Step 7: Delete the now-unused parent helper.**

The `showActive` function (around line 82–84) is no longer called anywhere:

```tsx
function showActive() {
  setViewMode("active");
}
```

Delete it.

- [ ] **Step 8: Type-check, lint, test.**

```bash
npx tsc --noEmit
npm run lint
npm test
```
Expected: all pass.

- [ ] **Step 9: Manual smoke test.**

Run `npm run dev`. Test each scenario:
- **Completed preset with no completed tasks** → empty state shows only `Open Preferences`.
- **Active view filtered to nothing** → empty state shows `Clear Tag Filters` only.
- **Show Archived Tasks** with no archive entries → empty state has no actions (or just shows "No archived tasks").
- **Show Archived Tasks** with entries → per-archived-task panel shows Unarchive, Open done.txt, Open Preferences in that order.
- Confirm `Open done.txt` actually opens `~/done.txt`.

- [ ] **Step 10: Commit.**

```bash
git add src/tasks.tsx
git commit -m "feat(tasks): drop cross-scope toggles from empty states and archive view"
```

---

## Task 5: Simplify `viewMode` (now write-once) and retint the active-filter list icon

Two small, low-risk cleanups.

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Convert `viewMode` from state to a derived constant.**

After Task 4, `setViewMode` is no longer called anywhere. Find the line in `TasksView`:

```tsx
const [viewMode, setViewMode] = useState<"active" | "archived">(initialView);
```

Replace with:

```tsx
const viewMode: "active" | "archived" = initialView;
```

And remove any stray `useState` import line only if it becomes unused (unlikely — many other states remain).

- [ ] **Step 2: Retint the active-filter list icon.**

Find the line (was 621 pre-refactor):

```tsx
icon={{ source: Icon.Filter, tintColor: Color.Blue }}
```

Replace with:

```tsx
icon={{ source: Icon.Filter, tintColor: Color.SecondaryText }}
```

- [ ] **Step 3: Type-check, lint, test.**

```bash
npx tsc --noEmit
npm run lint
npm test
```
Expected: all pass.

- [ ] **Step 4: Manual smoke test.**

Run `npm run dev`. In **Show Tasks**:
- Add a tag filter via ⌘F → "Add +foo".
- The "Active filters" section appears at the top of the list. Its filter icon should be the muted secondary-text grey, not blue.

Launch **Show Archived Tasks** and **Show Completed Tasks** to confirm `viewMode` still routes correctly.

- [ ] **Step 5: Commit.**

```bash
git add src/tasks.tsx
git commit -m "style(tasks): simplify write-once viewMode and mute active-filter icon"
```

---

## Final verification

- [ ] **Run the full suite once more from a clean slate.**

```bash
npm run lint
npx tsc --noEmit
npm test
```
Expected: all green.

- [ ] **Manual end-to-end pass in Raycast.**

With `npm run dev` running:
1. Show Tasks → action panel is 11 actions in 3 sections. ⌘E, ⌘P, ⌃X, ⌘⇧A, ⌘F, ⌘⇧F, ⌘O, ⌘R, ⌘D, ⌘⇧G all behave as before.
2. Show Completed Tasks → opens completed scope directly. Per-task panel still works (Complete toggles incomplete; Set Priority works, etc.).
3. Show Archived Tasks → opens archive scope directly. Per-task panel has Unarchive, Open done.txt, Open Preferences.
4. Active-filter list section uses the muted grey icon.
5. No empty state offers `Show Active Tasks`.
6. Quick Add still works (creates a task into `~/todo.txt`).

- [ ] **Final commit if anything stragglers came up; otherwise prepare for merge.**

```bash
git log --oneline main..feature/actions-menu-cleanup
```
Expected: five commits — refactor, feat (new commands), feat (panel trim), feat (empty states), style (viewMode + icon).

---

## Notes

- `package.json` reflow: `npm install` occasionally reflows `categories` / `platforms` onto multiple lines, which Biome rejects. If lint complains after Task 2, re-collapse those arrays onto one line each.
- `vitest.config.ts` aliases `@raycast/api` to a minimal stub at `src/__mocks__/@raycast/api.ts`. This plan introduces no new Raycast-API imports beyond what `tasks.tsx` already uses; the stub should not need updating. If a future task does need a new export, add it there.
- `src/components/TaskForm.tsx` is unaffected — `Edit Raw` is preserved and `New Task` was the only consumer being dropped.
