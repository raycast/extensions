# TXTodo — UX iteration

**Date:** 2026-05-14
**Status:** Design — pending implementation
**Supersedes:** the relevant in-scope/out-of-scope and UI sections of [`2026-05-14-txtodo-raycast-design.md`](./2026-05-14-txtodo-raycast-design.md). Architecture, domain model, I/O layer, error handling, and testing strategy are unchanged.

## 1. Context and goals

The first build of TXTodo shipped a keyboard-first Raycast extension that mirrors the todo.txt CLI experience: raw-line editing, quick-add via a global hotkey, tags shown as right-side chips. After using it, three rough edges emerged:

1. The user has to remember todo.txt syntax (`(A) ... +project @context due:YYYY-MM-DD`) to add or edit tasks.
2. The extension is only reachable via Raycast's launcher — no ambient presence on the system.
3. Tags appearing as right-side accessories *and* baked into the source line create visual redundancy and obscure context that reads more naturally inline.

This iteration addresses all three:

- Add a menu bar command for ambient access and quick visibility.
- Replace the raw line editor with a structured form so syntax knowledge is no longer required.
- Render tags inline in the task title; keep only the due-date chip on the right.

The "get in, do the thing, get out" benchmark from the original spec still holds for power flows (Show Tasks remains keyboard-first; menu bar gives ambient access).

## 2. Scope

### In scope

- New Raycast command: `menu-bar` (mode `menu-bar`) with pending count, top-N task dropdown, and quick actions.
- Rewritten `TaskForm` component with structured fields (description, priority, projects, contexts, due date).
- Quick-add command converts from no-view (raw argument) to view mode, reusing the structured form.
- Tag rendering in `tasks.tsx`: inline in title; only due-date stays as a right-side chip.
- New domain helper `taskFromFields` for building a `Task` from structured inputs without parsing.

### Out of scope

- Live-refresh in the menu bar (no file watcher there — Raycast manages the menu-bar lifecycle).
- Inline complete-from-menu-bar (v1 dispatches to Show Tasks for mutations).
- Always-on-top floating panel (still out of scope from original spec).
- Recurring tasks, reminders, notifications.

## 3. Architecture impact

No layer reshuffling. The dependency direction (`domain → io → UI`) stays intact. Changes per layer:

- **`domain/`**: add `taskFromFields(...)` to `task.ts`. No other domain changes.
- **`io/`**: no changes.
- **UI**:
  - New file `src/menu-bar.tsx` — the menu-bar command.
  - Rewritten `src/components/TaskForm.tsx` — structured Form.
  - Modified `src/tasks.tsx` — strip `stripTagsForDisplay` and project/context accessories; thread `knownProjects` / `knownContexts` to the form.
  - Modified `src/quick-add.tsx` — view-mode wrapper around `TaskForm`.
  - Modified `package.json` — add `menu-bar` command; remove the `arguments` block on `quick-add`.

## 4. Menu bar command

### Manifest entry

```json
{
  "name": "menu-bar",
  "title": "TXTodo Menu Bar",
  "description": "Show pending count and quick-access tasks in the macOS menu bar",
  "mode": "menu-bar"
}
```

### Behavior

- **Icon and title**: a built-in Raycast icon (e.g. `Icon.CheckCircle`) plus the pending-task count as title text. If zero pending, the count is omitted.
- **Pending** means tasks with `completed === false`.
- **Dropdown content** when the user clicks the icon:
  1. **Top 10 active tasks**, ordered by priority group (A → Z → none), with `sortGroup` applied within each group (due-date ascending, then file order). Each item shows the priority + description (tags inline, same rendering as the list view).
  2. **Bottom section** with three items: "Add Task", "Open Show Tasks", "Reload".
- **Per-task action**: clicking a task item invokes Raycast's `launchCommand` to open Show Tasks. No inline complete in v1 — mutations stay in the main view to avoid stale state.
- **Refresh**: the menu-bar process re-reads `todoPath` each time the dropdown opens. No long-running watcher. If `read()` returns `notfound`, render a single item "No todo.txt found — open Show Tasks to create it" that launches the Show Tasks command.

### Error handling

- Read failure (EACCES, EISDIR, etc.) → show one item titled "Couldn't read todo.txt", click → opens Show Tasks (which surfaces the toast and Open Preferences action already implemented in `tasks.tsx`).

## 5. Structured form

### `TaskForm.tsx` rewrite

The component shape changes from a single `TextField` to a multi-field form. New props:

```ts
type Props = {
  mode: "edit" | "new";
  initialTask?: Task;           // populated in edit mode
  knownProjects: string[];      // pre-populates the projects TagPicker
  knownContexts: string[];      // pre-populates the contexts TagPicker
  onSubmit: (task: Task) => Promise<void>;
};
```

Form fields:

| Field | Raycast component | Notes |
|---|---|---|
| Description | `Form.TextField` | Required. Help text: "Plain text — no need for todo.txt syntax." |
| Priority | `Form.Dropdown` | 27 entries: "None" + A–Z. Default "None" for new, current value for edit. |
| Projects | `Form.TagPicker` | Pre-populated with `knownProjects`. Users can type to add new tags. |
| Contexts | `Form.TagPicker` | Same shape, with `knownContexts`. |
| Due date | `Form.DatePicker` | Optional. Cleared via the DatePicker's built-in clear. |

The submit action's title remains "Save" (edit) or "Add Task" (new), bound to `⌘↵`.

### Submit flow

1. Form values are gathered: `{ description, priority, projects, contexts, due }`.
2. **Defensive tag merge:** if the user typed `+foo` or `@bar` in the description field (e.g. by habit), `taskFromFields` extracts them and merges them into the structured `projects` / `contexts` lists, then strips them from the description it stores. This guarantees a tag never appears twice in the serialized line.
3. The `due` value is a JS `Date` from `Form.DatePicker`. `taskFromFields` formats it as `YYYY-MM-DD` for `metadata.due` (using the system local date, same as the existing `today()` helper).
4. `taskFromFields` constructs a canonical `Task` with `raw` re-serialized. It also fills `creationDate` via `withCreationDate` when the preference is enabled and the task is new.
5. The resulting `Task` goes into `applyMutation` (existing logic).

### Edit-mode population

The caller passes `initialTask` (a `Task` already parsed from the file). The form pre-fills:

- description ← `initialTask.description` with tags stripped (so they don't appear twice — once in the field, once in the TagPicker). Re-use the inverse of `stripTagsForDisplay`'s logic, but isolated as a domain helper `stripTagsFromDescription(description: string)`.
- priority ← `initialTask.priority ?? "none"`
- projects ← `initialTask.projects`
- contexts ← `initialTask.contexts`
- due ← `initialTask.metadata.due` as `Date | null`

### Validation

- Description is required (Form.TextField with `info`/`error` props).
- Due date can be cleared.
- The Dropdown's "None" entry maps to `undefined` priority on submit.

## 6. New domain helper

In `src/domain/task.ts`:

```ts
type Fields = {
  description: string;
  priority?: Priority;
  projects: string[];
  contexts: string[];
  due?: string;             // ISO YYYY-MM-DD
  creationDate?: string;
  completed?: boolean;
  completionDate?: string;
};

export function taskFromFields(fields: Fields): Task
```

Builds a `Task` with `raw` re-serialized via `serializeTask`. The serializer needs no changes — it already canonicalizes the line.

`taskFromFields` runs `extractTags` (the existing helper in `parser.ts`) on `fields.description` before constructing the Task. Any tags found are merged with `fields.projects` / `fields.contexts` (deduplicated), and the description is replaced with the tag-free remainder. This is the defensive merge described in §5.

Tests:
- Round-trip: `taskFromFields` then `serializeTask` produces the expected line for every field combination (table-driven).
- Defensive merge: typing `+foo` in the description field ends up in `projects`, not duplicated.
- Edit-mode helper `stripTagsFromDescription` is unit-tested separately.
- `extractTags` is currently a non-exported helper in `parser.ts`. This iteration promotes it to an `export function` so `taskFromFields` (in `task.ts`) can call it. No behavior change.

## 7. Quick-add command change

### Manifest

Replace the existing entry. Remove the `arguments` block; change `mode` to `view`:

```json
{
  "name": "quick-add",
  "title": "Add Task",
  "description": "Open a structured form to add a new task",
  "mode": "view"
}
```

### Implementation

`src/quick-add.tsx` becomes a thin wrapper that renders `TaskForm` directly:

```tsx
export default function QuickAdd() {
  // 1. read snapshot to gather knownProjects/knownContexts
  // 2. render <TaskForm mode="new" ... />
  // 3. onSubmit: writeAtomic with the constructed task, retry up to 3× on conflict
  // 4. on success: showToast + pop()
}
```

Workflow: global hotkey → form opens → fill fields → ⌘↵ → toast → form dismisses. One extra step versus the old raw shortcut, but no syntax to memorize.

## 8. Inline tags in the task title

In `src/tasks.tsx`:

- Delete the `stripTagsForDisplay` function and its call site. The title becomes `${titlePrefix}${task.description}`.
- Remove the project and context entries from the `accessories` array. Only the due-date chip remains.
- The completed-task `"✓ "` prefix stays.

No other UI changes. The menu-bar dropdown uses the same rendering rule (inline tags, due only as chip — though the dropdown is text-only so the due:X token just appears inline there too).

## 9. Testing strategy

- **New unit tests** for `taskFromFields` and `stripTagsFromDescription` in `src/domain/task.test.ts`.
- **Existing tests** continue to pass unchanged (50 currently — the rewrite of `TaskForm` and `quick-add.tsx` doesn't have direct unit coverage; the underlying behavior is exercised by the domain tests).
- **Manual smoke** (post-implementation, on the user's machine outside the sandbox):
  - Menu bar shows correct count; clicking shows top 10; clicking a task opens Show Tasks.
  - "Add Task" command opens the structured form. Filling and submitting adds a correctly-formatted line to `todo.txt`.
  - Edit on an existing task pre-fills fields correctly.
  - List items show `+project @context` inline; due dates show as a magenta chip on the right.

## 10. Decisions log (this iteration)

| Decision | Choice |
|---|---|
| Menu bar shape | Icon + count + dropdown of top 10; click → Show Tasks |
| Raw editor | Removed entirely; structured form everywhere |
| Quick-add | Converted from no-view (raw argument) to view (structured form) |
| Inline tags | Projects/contexts inline; due-date stays as chip |
| Menu bar live refresh | Out — re-reads on open only |
| Inline complete in menu bar | Out — v1 dispatches to Show Tasks |
