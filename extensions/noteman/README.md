# Noteman

Noteman is a keyboard-first Raycast extension for local Markdown note-taking.

## Commands

- **Browse Notes**: Search notes, preview markdown, and manage notes with actions.
- **Quick Capture**: Capture text to today's daily note, a new note, or append to an existing note.
- **New Note**: Create a new note with title and content.
- **Open Today's Note**: Open or create today's daily note.

## Storage

Noteman stores notes in the folder from extension preferences:

- **Preference**: `Notes Folder Path`
- **Default**: `~/Documents/Notes`

All files are UTF-8 `.md`.

## Naming

- Daily note: `YYYY-MM-DD.md`
- Regular note: `YYYY-MM-DD HHmm - slug-title.md`

Examples:

- `2026-03-04.md`
- `2026-03-04 1140 - project-ideas.md`

## Development

```bash
npm install
npm run dev
```
