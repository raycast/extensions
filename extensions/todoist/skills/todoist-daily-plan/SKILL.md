---
name: todoist-daily-plan
description: Use when a user wants a realistic daily plan from Todoist, help triaging their inbox, or focused changes to tasks after reviewing priorities and commitments.
---

# Daily plan

## When to use

Use for daily planning or inbox triage. Start with a proposal unless the user
explicitly asks to create, update, move, or complete tasks.
Use only this extension's tools named below.

## Workflow

1. Establish the planning date, timezone, available work time, and must-do outcomes.
   Call `get-other-data` with `resource_types: "[\"user\"]"` when account
   context is needed. Call `get-projects` to resolve project names and the inbox.
2. Call `get-tasks` with an appropriate Todoist filter in `query`, such as
   `today | overdue`. For inbox triage, scope a separate query to the actual inbox.
   Use boolean filter operators; do not use commas to request separate result lists.
3. Read task descriptions, due dates, deadlines, priorities, recurrence, and projects.
   Call `get-comments` with `task_id` when a task needs supporting context.
   Fetch sections or labels through `get-other-data` with an explicit JSON array
   in `resource_types` when proposed organization requires those IDs or names.
4. Choose a small achievable set, keeping overdue commitments visible and separating
   hard deadlines from preferred work dates. Label duration estimates as estimates.
   Identify unclear, duplicate, or oversized inbox items and propose next actions.
5. Present the plan before making changes unless the request already specifies them.
   Ask only for details needed for a requested write, such as an ambiguous project
   or date. Do not convert a suggested work slot into an invented deadline.
6. Use `create-task` for requested new tasks and `update-task` for requested edits.
   Preserve recurrence and other unrelated fields. Use `move-task` with `id`
   and one resolved destination; a section or parent move must stay in its project.
   Call `complete-task` only when the user says the work is complete.
7. Inspect each returned `sync_status` for failure, then query affected tasks again
   with `get-tasks`. A recurring task can advance to its next occurrence after
   completion. If a write is uncertain, inspect current state before retrying.

## Output

- Planning date, available time, and assumptions.
- A short ordered plan with task links, due dates, and reasons for inclusion.
- Inbox recommendations and deferred work, clearly distinguished from saved changes.
- Confirmed writes, failures, and any missing context or retrieval limitations.

## Do not

- Do not invent priorities, deadlines, durations as facts, or completion status.
- Do not bulk-reschedule, delete, or complete tasks merely to clear the inbox.
- Do not remove recurrence or treat a partial task response as a complete workload.
