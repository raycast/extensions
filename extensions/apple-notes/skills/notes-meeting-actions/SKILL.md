---
name: notes-meeting-actions
description: Use when a user wants to turn an Apple Notes meeting note into decisions, action items, and follow-up questions, optionally appending the result to the note.
---

# Meeting actions

## When to use

Use for extracting actions from a meeting note or reviewing several meeting notes.
Return the action list in chat unless the user asks to save it in Apple Notes.
The available tools do not create reminders or tasks in another application.

## Workflow

1. Identify the meeting by title, date, or tags. Call `search-notes` with
   `searchText` or comma-separated `tags`. Search matches are candidates,
   not complete note content. Clarify if several meetings match the request.
2. Call `get-note-content` with the returned `noteId` for each selected note.
   Read the full returned content before extracting actions. If retrieval fails,
   state which note could not be read and avoid filling in its contents.
3. Extract decisions, explicit commitments, unresolved questions, and action items.
   Keep each action tied to the source note and a short supporting passage.
   Separate suggestions discussed in the meeting from commitments actually made.
4. For each action, capture the task, owner, due date, and dependencies if stated.
   Use “Unassigned” or “Not stated” where details are absent. Resolve a relative
   deadline only when the meeting date and intended timezone make it unambiguous.
5. Combine repeated actions across notes without erasing changes or disagreements.
   Surface conflicting owners or dates as questions. Preserve any existing
   completion markers; absence of a marker is not evidence that work is incomplete.
6. If the user requested saving, call `get-note-content` again before writing.
   Compare the proposed section with the existing content to avoid duplicate appends.
   Call `append-to-note` with `noteId` and an HTML action section in `content`.
   Use headings, paragraphs, and lists, and escape literal text for HTML.
7. Call `get-note-content` to verify the appended section. If the write response
   is uncertain, inspect the note before retrying. Report only confirmed changes.

## Output

- Meeting title and date, with a returned source link when available.
- Decisions and an action table: task, owner, due date, dependency, source evidence.
- Questions needed to resolve missing or conflicting details.
- Save status: proposed in chat or verified as appended to the selected note.

## Do not

- Do not invent commitments, owners, deadlines, or completion status.
- Do not replace or delete the original note to add an action summary.
- Do not claim to create Apple Reminders, calendar events, or assigned external tasks.
