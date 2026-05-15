# Contributing

This document explains how the extension is structured, how data flows through it, and how the main pieces connect.

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  Raycast                                         │
│  ┌────────────┐    ┌────────────────────────┐    │
│  │ oauth.ts   │───▶│  withAccessToken(google)│    │
│  └────────────┘    └───────────┬────────────┘    │
│                                │ wraps            │
│       ┌────────────────────────┼───────────┐     │
│       │                        │           │     │
│  ┌────▼──────┐          ┌─────▼─────┐     │     │
│  │view-tasks │          │create-task │     │     │
│  │   .tsx    │          │   .tsx     │     │     │
│  └────┬──────┘          └─────┬─────┘     │     │
│       │                       │            │     │
│       └───────────┬───────────┘            │     │
│                   │ calls                   │     │
│              ┌────▼────┐                   │     │
│              │  api.ts │                   │     │
│              └────┬────┘                   │     │
│                   │ fetch                   │     │
└───────────────────┼────────────────────────┘     │
                    │                               
          ┌─────────▼──────────┐                   
          │ Google Tasks API v1│                   
          └────────────────────┘                   
```

## File-by-File Breakdown

### `src/oauth.ts`

Sets up Google OAuth using Raycast's built-in `OAuthService`. It reads the user's `clientId` preference and requests the `tasks` scope. The exported `google` object is used by both commands to gate access behind authentication.

The OAuth flow itself (token exchange, refresh, storage) is handled entirely by `@raycast/utils` — no manual token management is needed.

### `src/types.ts`

Shared TypeScript interfaces:

| Type | Purpose |
|------|---------|
| `TaskList` | A Google Tasks list (`id`, `title`) |
| `Task` | A single task with optional `due`, `completed`, `notes`, `parent` |
| `TaskForm` | Shape of form data when creating/editing (`title`, `notes`, `due`) |
| `Filter` | Enum for the view filter: `Open`, `Completed`, `All` |

### `src/api.ts`

Thin REST client over the Google Tasks API v1 (`https://tasks.googleapis.com/tasks/v1`).

**Auth**: Every request calls `getAccessToken()` to get the current OAuth bearer token, then attaches it as an `Authorization` header.

**Functions**:

| Function | HTTP | What it does |
|----------|------|--------------|
| `fetchTaskLists()` | `GET /users/@me/lists` | Returns all task lists for the signed-in user |
| `fetchTasks(listId, showCompleted)` | `GET /lists/{listId}/tasks` | Fetches up to 100 tasks. Sorts: open tasks by due date (soonest first, no-date last), completed tasks by completion time (newest first) |
| `createTask(listId, task)` | `POST /lists/{listId}/tasks` | Creates a new task. Serializes the due date to RFC 3339 midnight UTC |
| `toggleTask(listId, task)` | `PATCH /lists/{listId}/tasks/{taskId}` | Flips status between `needsAction` and `completed` |
| `editTask(listId, taskId, updates)` | `PATCH /lists/{listId}/tasks/{taskId}` | Updates title, notes, and/or due date |
| `deleteTask(listId, taskId)` | `DELETE /lists/{listId}/tasks/{taskId}` | Permanently removes a task |

**Due date serialization**: Google Tasks expects `YYYY-MM-DDT00:00:00.000Z`. The `serializeDueDate` helper normalizes a `Date` object into this format.

### `src/view-tasks.tsx`

The main command. It contains multiple components layered via Raycast's navigation stack:

1. **`ViewTasks`** (root) — Fetches all task lists and renders them as a searchable `List`. Selecting a list pushes `TaskListView`.

2. **`TaskListView`** — Fetches tasks for the selected list and renders them with a filter dropdown (Open / Completed / All). Each task item shows:
   - An icon: green checkmark (completed), red circle (overdue), hollow circle (open)
   - Subtitle: the task notes
   - Accessory text: due date or "Completed"

   Actions per task:
   - **Enter** → Complete / Reopen (toggles status)
   - **⌘E** → Push `EditTaskForm`
   - **⌘N** → Push `InlineCreateTaskForm`
   - **⌘⌫** → Delete

3. **`EditTaskForm`** — A `Form` pre-filled with the task's current title, notes, and due date. On submit, calls `editTask` and pops back.

4. **`InlineCreateTaskForm`** — A `Form` for creating a task within the current list. On submit, calls `createTask` and pops back.

All mutations optimistically show a loading toast and refresh the task list on success.

### `src/create-task.tsx`

A standalone command that opens a form to create a task without navigating through lists first. It fetches all task lists to populate a dropdown, so the user can pick which list to add to. On success, it pops to the Raycast root.

## Data Flow: Creating a Task

1. User opens "Create Task" command
2. Raycast runs `withAccessToken(google)` — prompts sign-in if needed
3. `CreateTask` component mounts → calls `fetchTaskLists()` → populates the list dropdown
4. User fills in title, notes, due date, selects a list
5. On submit → `createTask(listId, { title, notes, due })` is called
6. `api.ts` serializes the due date, builds a JSON body, sends `POST` with bearer token
7. On success → toast + `popToRoot()`

## Data Flow: Completing a Task

1. User opens "View Tasks" → selects a list → sees tasks
2. User presses Enter on an open task
3. `handleToggle(task)` calls `toggleTask(listId, task)`
4. `api.ts` sends `PATCH` with `{ status: "completed" }`
5. On success → toast + `loadTasks()` re-fetches and re-renders the list
