# Raylog

Minimalist task management and progress logging in Raycast, backed by a single
standalone markdown note.

Raylog is a compact Raycast extension for people who want fast local task capture
without adopting a larger notes or project-management stack. It stores tasks in
one markdown file, but the workflow is built entirely around Raycast. Beyond
tracking what needs to get done, Raylog lets you log work as you make progress,
so each task carries its own running history of effort, updates, and momentum.

## Features

- Status-driven task lifecycle: `To Do`, `In Progress`, `Done`, `Archived`
- Built-in work logging so tasks capture progress, not just status
- Filtered list views for focused review instead of one long mixed list
- Urgency-aware ordering for active work
- Optional macOS menu bar task view for active work
- Configurable list metadata for due and start countdown indicators
- Quick actions for logging work, start, complete, reopen, archive, and delete
- Structured markdown-backed storage with resettable setup

## Workflow

### List Tasks

Use **List Tasks** to manage work and record progress from one command.

- Filter by `All Tasks`, `Open Tasks`, `To Do`, `In Progress`, `Due Soon`, `Done`, or `Archived`
- `Open Tasks` includes `To Do` and `In Progress`; `All Tasks` also includes `Done`
- Search task headers and bodies within the active view
- Use `Cmd+F` to switch between `Task Summary` and the full-width `Task List`
- The command reopens in the last list layout you used
- `Task Summary` shows the task body and work logs in the detail pane
- `Task List` shows each row as status, header, body preview, start date, and due date
- Use `Cmd+L` to jump straight into logging from the selected task
- Keep a running history of progress directly on each task through timestamped
  work logs
- Trigger lifecycle actions without leaving the list
- Open the form to edit or create tasks

### Add Task

Use **Add Task** to create a task with:

- **Header** (required)
- **Body**
- **Status**
- **Due Date**
- **Start Date**

### Refresh Menu Bar

Use **Refresh Menu Bar** to show your current Raylog task in the macOS menu bar.

- The menu bar feature is inactive until you run `Refresh Menu Bar` in Raycast for the first time
- It only shows active tasks (`To Do` and `In Progress`)
- Clicking the current task or a task in the `Next 5 Tasks` section opens a task submenu
- The submenu lets you `Start Task`, `Complete Task`, `Archive Task`, or `Open Task`

To enable it:

1. Open Raycast and run `Refresh Menu Bar`
2. Activate the command in Raycast's built-in menu bar controls if prompted

To disable it:

1. Open Raycast settings for `Refresh Menu Bar`
2. Use Raycast's built-in `Deactivate` control for that menu bar command

## Storage Model

Raylog manages a JSON block inside your configured markdown note.

````json
<!-- raylog:start -->
```json
{
  "schemaVersion": 1,
  "tasks": [],
  "viewState": {
    "hasSelectedListTasksFilter": false,
    "listTasksFilter": "open",
    "hasSelectedListViewMode": false,
    "listViewMode": "summary"
  }
}
```
<!-- raylog:end -->
````

Markdown outside the managed block is preserved. The managed block is intended to
be written by Raylog, not edited manually.

If the storage block is malformed or from an old schema, Raylog will prompt you
to reset the note to a fresh document.
