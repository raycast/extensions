---
name: granola-meeting-actions
description: Use when a user wants action items, decisions, or follow-up questions extracted from Granola meeting notes and transcripts, including a review across several meetings.
---

# Meeting actions

## When to use

Use to turn Granola meeting records into an evidence-based action list in chat.
The available tools do not create or assign tasks in an external task manager.
Use only this extension's tools named below.

## Workflow

1. Establish the meeting title, date range, or folder and whether shared notes
   belong in scope. Call `list-folders` when a folder needs resolving to an ID.
   Clarify ambiguous meetings or folders before extracting actions.
2. Call `list-meetings` with relevant `title`, `date`, `folderId`, `limit`,
   and `source`. Its results are metadata, not note content.
   Check the returned dates and folder IDs against the requested scope yourself.
   Relative week filters can represent a rolling period; use the intended boundaries.
3. Call `get-note-content` with each selected `noteId` and `contentType: "auto"`.
   Distinguish enhanced notes from original notes when that affects attribution.
   A retrieval error or “Error loading note” response is missing data, not an empty meeting.
4. Call `get-transcript` with `noteId` when the notes leave a commitment, owner,
   or date ambiguous. Treat an unavailable transcript as a limitation.
   Speaker labels such as “Me” or “System” do not identify other participants by name.
5. Extract explicit decisions and commitments, preserving a short supporting passage
   and the source meeting. Separate proposed ideas from agreed action items.
   Record owner, due date, dependencies, and completion only when supported.
6. Resolve relative dates only when the meeting date and context are sufficient.
   Combine duplicate actions across meetings while preserving changed commitments
   and conflicting details. Keep unresolved owners or dates as open questions.
7. Report the action list and source coverage. If the user wants tasks saved in
   another app, explain that no task-creation tool is available in this extension.
   Do not describe an extracted action as a saved or assigned task.

## Output

- Meeting titles and dates covered, with returned links when available.
- Decisions and an action table: task, owner, due date, dependencies, source evidence.
- Unassigned actions, conflicting commitments, and follow-up questions.
- Notes or transcripts that could not be read and limits on the review period.

## Do not

- Do not invent owners, deadlines, decisions, speaker identities, or completed work.
- Do not claim to create tasks or modify notes with the available read tools.
- Do not export notes to Notion or change folders merely to extract action items.
