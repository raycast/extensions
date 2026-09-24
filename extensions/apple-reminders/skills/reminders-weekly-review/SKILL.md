---
name: reminders-weekly-review
description: Use when a user wants a weekly review of Apple Reminders, an actionable plan from their reminder lists, or action items captured from meeting notes they provide.
---

# Weekly review

## When to use

Use to review outstanding reminders, reflect on completed work, or capture actions
from text supplied by the user. This extension cannot fetch Apple Notes content.
A review produces recommendations unless the user asks to change reminders.

## Workflow

1. Establish the review period and timezone from the request or ask if unclear.
   Call `get-lists` and `get-reminders` to identify the relevant lists and open items.
   Keep the returned reminder and list IDs for later lookups and changes.
2. If the user wants a completed-work review, call `get-completed-reminders`,
   supplying `listId` for a selected list. Filter by returned completion dates
   when available; disclose when the requested period cannot be established.
3. Group open items into overdue, due during the review period, and undated.
   Compare titles and notes to identify possible duplicates, without deleting them.
   Separate actual due dates and priorities from recommendations about what to do next.
4. For pasted meeting notes, extract concrete actions and retain their source context.
   Record an owner and due date only when the text supplies them. Flag unclear actions
   and distinguish the user's work from actions assigned to someone else.
5. Present a short plan and proposed changes. If the user asked only for a review,
   stop at the proposal. Clarify any ambiguous destination list or requested date.
6. For requested new items, call `create-reminder` with `title`, relevant `notes`,
   and the chosen `listId`. Set `dueDate`, `priority`, or `recurrence` only when explicit.
   Use a full calendar date for due dates; use recurrence only with a known next date.
   Check existing reminders first so repeated captures do not create duplicates.
7. For requested edits, call `update-reminder` with the returned `reminderId`
   and only the requested fields. Set `isCompleted` only when completion is confirmed.
   Fetch `get-reminders` again to verify edits or creations; use
   `get-completed-reminders` to verify requested completions.

## Output

- Review period and lists covered, with any data gaps.
- Completed work, overdue commitments, and a small proposed next-action list.
- For extracted actions: task, owner if stated, due date if stated, and source context.
- Changes confirmed by the tools, plus unresolved dates, duplicates, or questions.

## Do not

- Do not invent deadlines, priorities, recurrence, owners, or completion evidence.
- Do not delete duplicates or mark tasks complete as part of a read-only review.
- Do not claim to fetch notes from another app or move lists with `update-reminder`.
