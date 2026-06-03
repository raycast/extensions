# todo.txt

Manage tasks in [todo.txt](http://todotxt.org) format directly from Raycast. Add, search, complete, prioritize, and archive tasks — all stored as plain text so your data stays yours.

## Setup

Open **Raycast Preferences → Extensions → todo.txt** and set the path to your `todo.txt` file. The file will be created automatically the first time you add a task if it doesn't exist yet.

| Preference | Description |
|---|---|
| **todo.txt File** | Path to your todo.txt file (required) |
| **done.txt File** | Path for archiving completed tasks. Defaults to `done.txt` in the same folder as your todo.txt. |
| **Archive Completed Tasks** | Move completed tasks to done.txt instead of keeping them in todo.txt |
| **Default Sort Order** | How tasks are sorted when you open the list |
| **Show Completed Tasks** | Show completed tasks in the main list (only relevant when Archive is off) |
| **Group By** | Default grouping for the task list |

## todo.txt Format

Each line in your file is one task. The format is:

```
(A) 2026-01-15 Call the dentist +Health @phone due:2026-01-20
x 2026-01-14 (B) 2026-01-10 Buy groceries +Errands @store
```

| Token | Meaning | Example |
|---|---|---|
| `x` | Completed task | `x 2026-01-14 Task text` |
| `(A)` | Priority (A–Z) | `(A) Important task` |
| `2026-01-15` | Creation date | After priority if present |
| `+Project` | Project tag | `+Work`, `+Health` |
| `@context` | Context tag | `@phone`, `@home` |
| `due:YYYY-MM-DD` | Due date | `due:2026-01-20` |

## Commands

### List Todos
Browse and manage all your pending tasks. Use the dropdown to change sort order and grouping. 

- **⌘D** — Mark as complete (or incomplete if already done)
- **⌘E** — Edit task
- **⌘N** — Create new task
- **⌘⇧H** — Toggle showing completed tasks
- **⌘R** — Refresh list
- **⌫** — Delete task

### Add Todo
Form-based task creation with fields for text, priority, project, context, and due date.

### Quick Add Todo
Create a task by typing raw todo.txt syntax directly — fastest way to add tasks without leaving your flow.

### List Completed Todos
Browse tasks in your `done.txt` file. You can restore a completed task back to `todo.txt` or permanently delete it.

### Todo Count (Menu Bar)
Shows the number of pending tasks in your menu bar. Turns red if any tasks are overdue. Click a task to mark it complete directly from the menu bar.
