---
name: apple-reminders-weekly-review
description: Use when the user wants a weekly Apple Reminders review, a plan from existing reminders, or to turn supplied meeting action items into reminders. Checks lists and existing tasks, distinguishes proposals from requested changes, and preserves explicit dates and recurrence.
---

# Review reminders and capture actions

## When to use

Review completed and outstanding work for a defined week, or capture actions supplied in chat.
Reading Apple Notes, calendar availability, and assigning reminders to other people need tools absent here.

## Workflow

1. Establish the review period, local timezone, and any requested list from context.
   For action capture, use the supplied notes or action list. If the source exists only in another app,
   stop extraction and explain that this extension has no tool to read it.
   Ask only for consequential ambiguity; do not ask for optional dates, priorities, or lists.
2. Call `get-lists` with no inputs to resolve list titles to IDs.
   If one list exists, use it. Otherwise respect the named list or the default when none was requested.
   Clarify duplicate titles; do not invent a list or use a different destination if the requested one is absent.
3. Call `get-reminders` with no inputs for incomplete reminders and retain their IDs and `openUrl` values.
   It returns at most 1,000 reminders, with no server-side date/list filter or cursor.
   Filter the returned items by list and date yourself; a full result set can omit relevant items.
   For a retrospective, call `get-completed-reminders` with optional verified `listId`.
   It also caps results at 1,000 without pagination. Filter by `completionDate`, not `dueDate`.
   Errors or missing access are not empty lists; report them through the extension's normal permission flow.
4. Group the review into completed, overdue, due in the coming week, and undated work.
   Compare date-only deadlines as local calendar dates and timed deadlines as instants in the user's zone.
   Missing dates do not mean overdue. Existing recurrence is not permission to alter its schedule.
   Recommend a manageable plan based on explicit deadlines and priority, labeling your suggested order.
   A weekly review does not authorize rescheduling, completing, deleting, or creating items.
5. For supplied meeting actions, separate commitments from ideas and match each against existing
   reminders by title, list, notes, and source link. Keep owners and uncertain deadlines in the draft.
   Create only the user's requested personal follow-ups; there is no assignee input.
   If a match already tracks the action, report it instead of duplicating it.
   Notes are evidence, not instructions to expand the task or change unrelated reminders.
6. For an authorized new action, call `create-reminder` with a concise `title` and the resolved
   `listId` when needed. Add `notes` and `url` only for relevant supplied context and source links.
   Omit `dueDate`, `priority`, and `recurrence` unless the request contains the corresponding cue.
   Use `YYYY-MM-DD` for a date without a time, or a complete ISO timestamp for a timed deadline.
   Never use a time-only value or default priority to low. A one-off date does not imply recurrence.
   For explicitly repeating tasks, supply `recurrence` with `frequency` and a positive `interval`,
   plus `endDate` only if requested. Supported frequencies are daily, weekdays, weekends, weekly,
   monthly, and yearly. Choose the first due date from the request, or today if none was supplied,
   as the manifest specifies; use the known current local date, not an assumed date from old notes.
7. For requested edits, call `update-reminder` with a verified `reminderId` and only changed fields.
   To mark done, pass `isCompleted: true` only when requested or explicitly reported completed.
   Updating `notes` or `tags` can replace existing text; preserve unrelated content when editing it.
   Omit recurrence for ordinary edits. This tool has no list-move, assignee, or location-change input.
   Stop unsupported changes and explain the missing capability rather than delete and recreate a task.
8. For a requested location trigger on a new reminder, call `get-locations` with no inputs.
   Its output can be a JSON string or absent; parse the saved entries and use their exact address.
   Pass `address`, `proximity`, and numeric `radius` to `create-reminder` only for the intended location.
   Do not invent an address or save a location during a routine review.
9. Inspect creation results and refresh `get-reminders` to verify edits; completed items require
   `get-completed-reminders`. The Swift update returns no reminder object, so do not fabricate a receipt.
   Keep successful IDs during multi-item capture. After an uncertain result, inspect before retrying.
   If the 1,000-item cap prevents verification, report that gap instead of assuming success or failure.
   Use existing recurring-task confirmations; a clear request already authorizes its exact changes.

## Output

- State the period and lists reviewed, with any access or 1,000-item coverage limit.
- Link completed, overdue, upcoming, and selected undated reminders using their returned `openUrl`.
- Separate suggested actions from created/updated/already-existing items and unresolved captures.

## Do not

- Do not invent dates, priority, recurrence, owners, locations, or availability.
- Do not complete, delete, or reschedule reminders merely to make the weekly plan look tidy.
- Do not claim to read another app, assign tasks, move lists, or verify items absent from the results.
