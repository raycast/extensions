# AI Tools Layer (Raycast AI Extensions)

**Date:** 2026-05-25
**Status:** Approved, pending implementation plan
**Scope:** `package.json`, new `src/tools/`, new fuzzy-match helper in `src/domain/`
**Companion:** `docs/superpowers/specs/2026-05-25-menu-bar-grouping-design.md` (independent feature, not a dependency)

## Goal

Add a conversational layer to the TXTodo Raycast extension by exposing four Raycast AI Tools: `list-tasks`, `add-task`, `complete-task`, `reschedule-task`. Users can talk to `@TXTodo` in Raycast AI chat to query, create, complete, and defer tasks via natural language. The tools ride on the existing `src/domain/` mutators and `src/io/todoFile.ts` IO — no domain layer rewrite, just adapters. Existing commands (`tasks`, `quick-add`, `menu-bar`) are not modified.

## Background

TXTodo currently surfaces tasks through four Raycast commands (Show Tasks, Add Task, menu bar, Toggle Menu Bar). All interaction is form- or list-driven, which is fast but requires the user to think in the extension's vocabulary (priority dropdowns, dropdown date options, etc.). Raycast AI Tools let an extension expose typed functions to the Raycast AI chat surface; users invoke them by addressing the extension (`@TXTodo what's overdue?`) and Raycast routes the call after type-checking arguments and (optionally) showing a confirmation preview.

The domain layer already exposes the right mutators (`taskFromFields`, `complete`, `applyPreset`, etc.). The IO layer already handles atomic writes with optimistic concurrency. The tools layer is therefore a thin composition over what exists — most files will be under 50 lines.

## Scope

**Changed:**
- `package.json` — add `tools[]` array (4 entries) and a top-level `ai.instructions` string.

**Added:**
- `src/tools/list-tasks.ts` — read tool, no confirmation.
- `src/tools/add-task.ts` — write tool with confirmation.
- `src/tools/complete-task.ts` — write tool with confirmation, uses fuzzy match.
- `src/tools/reschedule-task.ts` — write tool with confirmation, uses fuzzy match.
- `src/domain/fuzzyMatch.ts` — new pure helper: `bestMatch(tasks, query) → Task | null`. Has unit tests.
- `src/domain/fuzzyMatch.test.ts`.

**Untouched:**
- Existing commands and their UI files.
- `src/domain/` modules other than the new `fuzzyMatch.ts`.
- `src/io/todoFile.ts`.

## Design

### Manifest changes (`package.json`)

Add a `tools` array alongside the existing `commands` array, plus a top-level `ai` key:

```jsonc
{
  "tools": [
    {
      "name": "list-tasks",
      "title": "List Tasks",
      "description": "List active or completed tasks. Optionally filter by view preset (today, overdue, this-week, active, inbox, completed, all) and/or by a single +project or @context tag."
    },
    {
      "name": "add-task",
      "title": "Add Task",
      "description": "Create a new task. Description may include +project and @context tags inline. Optionally set priority (single letter A-Z) and due date (YYYY-MM-DD)."
    },
    {
      "name": "complete-task",
      "title": "Complete Task",
      "description": "Mark an active task as completed. Finds the task by fuzzy text match against the description."
    },
    {
      "name": "reschedule-task",
      "title": "Reschedule Task",
      "description": "Change the due date of an existing task. Finds the task by fuzzy text match; new date must be YYYY-MM-DD."
    }
  ],
  "ai": {
    "instructions": "Tasks use the todo.txt format. Priority is a single letter A-Z, A is highest. Projects are +name, contexts are @name. Due dates are always YYYY-MM-DD. When the user gives a relative date like 'Friday' or 'tomorrow', convert to YYYY-MM-DD before calling tools."
  }
}
```

### File organization

Raycast's build hardcodes the tool source directory to `src/tools/`. Each entry's `name` resolves to `src/tools/<name>.ts`. The four files are:

```
src/tools/
├── list-tasks.ts
├── add-task.ts
├── complete-task.ts
└── reschedule-task.ts
```

Each tool file is a thin adapter:
1. Define a typed `Input`.
2. Export `default function tool(input)` — read snapshot, call domain mutator(s), `writeAtomic` for writes, return a string to the AI.
3. For writes, also export `confirmation: Tool.Confirmation<Input>` that previews the action.

No new abstractions, no shared base class. Each file is independently readable.

### Tool contracts

#### `list-tasks`

```ts
type Input = {
  preset?: "all" | "active" | "today" | "this-week" | "overdue" | "inbox" | "completed";
  project?: string;   // without the leading +
  context?: string;   // without the leading @
};
```

Behavior:
1. Read snapshot. If `notfound`, return the standard not-found message.
2. Apply `applyPreset(tasks, preset ?? "active", new Date())`.
3. Apply project/context filters on top via `matchesFilters` (from `src/domain/tags.ts`).
4. Format as markdown: one line per task, including the file line number in brackets, priority in parens (or four spaces if none), the description with metadata stripped via `stripMetadataFromDescription` (so `due:YYYY-MM-DD` doesn't appear inline; `+project` / `@context` remain since they're part of the description per the parser), and relative due-date phrasing via `formatRelativeDue` (omitted if no due).

Return shape (markdown string):
```
- [12] (A) Draft launch email +work @writing — Fri
- [13]     Review Q2 report +work — Mon
- [14]     Pick up dry cleaning
```

If the filtered list is empty, return `"No tasks match."`.

No confirmation. Pure read.

#### `add-task`

```ts
type Input = {
  description: string;   // may include +project @context inline
  priority?: string;     // single letter A-Z (case-insensitive)
  due?: string;          // YYYY-MM-DD
};
```

Behavior:
1. Validate `priority` is a single A–Z letter (uppercase) if provided; otherwise drop with a soft warning in the return string.
2. Validate `due` matches `YYYY-MM-DD` if provided.
3. Build task via `taskFromFields({ description, priority, due, projects: [], contexts: [] })` — `taskFromFields` already extracts inline `+project`/`@context` from the description, so projects/contexts are intentionally empty.
4. If preference `autoStampCreationDate` is on, apply `withCreationDate`.
5. `writeAtomic` with up to 3 retries on conflict.
6. Return `"Added: <serialized line>"` on success.

Confirmation builds the same task it would build for real (steps 1–4 above, minus `writeAtomic`) and shows the serialized line:

```ts
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Add: '${serializeTask(taskFromInput(input))}'?`,
});
```

Where `taskFromInput` is a small file-local helper that runs the validation + `taskFromFields` + optional `withCreationDate` pipeline. The same helper is called by the default export to guarantee the confirmation preview matches what actually gets written. The serialized line is what the user sees, so they immediately notice if priority, due, or tags were misparsed.

#### `complete-task`

```ts
type Input = {
  query: string;
};
```

Behavior:
1. Read snapshot.
2. Filter to active tasks. Find best match via `bestMatch(activeTasks, input.query)`.
3. If no match, return `"No active task matched '<query>'"`.
4. Apply `complete(task, today)`. If preference `archiveOnComplete` is on, the existing IO layer handles archiving — tools call `writeAtomic` with the mutated list; archiving is already centralized.
5. Retry on conflict, return `"Completed: <description>"` on success.

Confirmation: looks up the match itself and shows it:
```ts
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const snapshot = await read(prefs.todoPath);
  if (snapshot === "notfound") return { message: "todo.txt not found." };
  const match = bestMatch(snapshot.tasks.filter(t => !t.completed), input.query);
  if (!match) return { message: `No active task matched '${input.query}'.` };
  return { message: `Complete: '${match.description}'?` };
};
```

#### `reschedule-task`

```ts
type Input = {
  query: string;
  due: string;  // YYYY-MM-DD
};
```

Behavior:
1. Validate `due` format.
2. Read, find best match (active only), apply a `setDue(task, due)` change. This mutator does not exist yet — add it to `src/domain/task.ts`:

```ts
export function setDue(task: Task, due: string | undefined): Task {
  const next = { ...task, metadata: { ...task.metadata } };
  if (due) next.metadata.due = due;
  else delete next.metadata.due;
  return { ...next, raw: serializeTask(next) };
}
```

   Add a small unit test covering set / clear.

3. `writeAtomic` with retries.
4. Return `"Rescheduled '<description>' from <oldDue|'no date'> to <newDue>"`.

Confirmation shows from/to:
```ts
return { message: `Reschedule '${match.description}' from ${match.metadata.due ?? 'no date'} to ${input.due}?` };
```

### Fuzzy match helper (`src/domain/fuzzyMatch.ts`)

Pure module, unit tested. Single function:

```ts
export function bestMatch(tasks: Task[], query: string): Task | null;
```

Algorithm (intentionally simple):
1. Lowercase the query and each task's description.
2. Score each task: number of matching whitespace-separated query tokens that appear as substrings of the lowercased description. Tokens of length < 2 are skipped (so "a", "the" don't drive matches).
3. If max score is 0, return `null`.
4. Among tasks tied at max score, pick the one with the **lowest `lineNumber`** (oldest in the file — matches the user's mental model of "the older one is the obvious referent").
5. Return that task.

Tests cover:
- Single-token query matches one task.
- Multi-token query: the task matching more tokens wins.
- Tie on tokens: lower `lineNumber` wins.
- Query with no matches returns `null`.
- Short tokens (`"a"`, `"to"`) are ignored.
- Case-insensitive matching.
- Empty task list returns `null`.

This module is intentionally dumb (no Levenshtein, no fuzzy character matching). The confirmation step is the safety net; if the user picks a query the simple algorithm can't resolve, they reject the confirmation and re-prompt with sharper terms.

### Concurrency & error handling

All write tools reuse the optimistic-concurrency pattern from `src/quick-add.tsx`:
- Read → mutate → `writeAtomic` → on conflict, re-read and retry, up to 3 attempts total.
- On final failure, return `"Couldn't apply change — the file kept changing. Try again."`.

If `todo.txt` does not exist, every tool returns: `"todo.txt not found at <path> — create it via the Show Tasks command first."`.

If a tool input validation fails, the tool returns a short error string explaining the issue. It does **not** silently coerce. Specific validation:
- **Priority**: must match `/^[A-Za-z]$/`; uppercased before use. Otherwise error `"Invalid priority '<value>' — must be a single letter A-Z."`.
- **Due date**: must match `/^\d{4}-\d{2}-\d{2}$/`. Otherwise error `"Invalid due date '<value>' — must be YYYY-MM-DD."`.

### Why no evals in this spec

Raycast's `ai.evals` mechanism is opt-in and is most useful once we observe real usage and want to gate against regressions. Shipping evals upfront would slow this work without a clear quality target. Deferred to a follow-up once the tools have been used in anger.

## Out of Scope

Explicitly **not** included:
- A `delete-task` tool — no destructive-without-undo operations in MVP.
- `set-priority`, `set-tags`, `uncomplete-task` tools — straightforward additions later, no design coupling.
- `ai.evals` — deferred.
- Any modification to existing commands or domain modules other than the new `setDue` mutator and the new `fuzzyMatch.ts` module.
- A README or marketing copy describing the AI feature externally.

## Success Criteria

- Manifest validates against `ray build` with the new `tools[]` and `ai` keys.
- `@TXTodo what's overdue?` returns a markdown list of overdue tasks.
- `@TXTodo add: draft launch email tomorrow +work @writing priority B` shows a confirmation with the parsed serialized line; on accept, the task is appended to `todo.txt` with correct priority, projects, contexts, and due date.
- `@TXTodo mark the launch email done` shows a confirmation with the matched task description; on accept, the task is marked complete and (if archive preference is on) moved to `done.txt`.
- `@TXTodo push the report to Friday` (with AI converting "Friday" → ISO) shows a confirmation with from/to dates; on accept, the task's `due:` is updated.
- All existing tests still pass.
- New tests for `fuzzyMatch.ts` and `setDue` mutator pass.
- `npm run lint` and `npx tsc --noEmit` clean.
- Tool files (`src/tools/*.ts`) are not unit-tested — they are thin adapters; the existing UI-layer coverage policy applies.
