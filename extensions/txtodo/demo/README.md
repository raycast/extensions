# Demo data for screenshots

Fixtures designed to exercise every feature visible in the Raycast Store screenshots. Reference date is **2026-05-15 (Friday)**; end-of-week is **Sunday 2026-05-17**.

## Use it

In Raycast → TXTodo preferences, set:

- **Todo file:** absolute path to `demo/todo.txt` (e.g. `~/Development/personal/TXTodo/demo/todo.txt`)
- **Done file:** absolute path to `demo/done.txt`

Then launch Show Tasks. Switch back to `~/todo.txt` after capturing screenshots.

## Line format

Order matters — the parser follows the [todo.txt spec](https://github.com/todotxt/todo.txt):

- **Active:** `(priority) creationDate description` — e.g. `(A) 2026-05-13 Submit expense report @work +admin due:2026-05-13`
- **Completed:** `x completionDate (priority) creationDate description` — e.g. `x 2026-05-14 (B) 2026-05-07 Send weekly status update @work +admin`

Putting the creation date before the priority (`2026-05-13 (A) ...`) makes the parser skip the priority — it ends up as part of the description text. Tasks then collapse into the "No priority" section.

## What's in there

| Feature                   | Where it shows up                                                        |
|---------------------------|--------------------------------------------------------------------------|
| Priorities A/B/C + none   | Visible across the Active view; section header per priority             |
| Overdue badge (red chip)  | "Submit expense report" (A), "Pay credit card bill" (C)                 |
| Due today (orange chip)   | "Finalize Q2 review deck", "Call dentist…"                              |
| Due this week             | "Review PR #142" (Sat), "Plan weekend hike" (Sun)                       |
| Future due dates          | Spread across May 18–25                                                 |
| Tag-colored chips         | Variety of `+project` (green) and `@context` (orange) tags              |
| Creation dates            | Every active task                                                       |
| Inbox candidates          | "Brainstorm side project ideas", "Pick a new podcast"                   |
| Completed in todo.txt     | Last two lines — visible under the **Completed** preset                 |
| done.txt (archive)        | 7 archived tasks — not shown in views, but proves the archive flow      |

## Suggested screenshots

1. **Show Tasks** → Active preset (default). Detail sidebar open on a task.
2. **Show Tasks** → Today preset. Shows overdue + today tasks under the red/orange chips.
3. **Show Tasks** → Inbox preset. Shows the two truly uncategorized tasks.
4. **Add Task** form with autocomplete dropdown visible (type `+w` to trigger).
5. Action panel (`⌘K`) on a task showing the available shortcuts.
6. Menu bar dropdown showing pending count + top tasks.
