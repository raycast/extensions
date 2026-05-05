# Obsidian Todo Manager

A private Raycast extension for adding and managing markdown todos inside your Obsidian `ToDo` note.

## What it does

- Reads markdown tasks directly from your Obsidian note.
- Adds new todos without moving the rest of the note into storage.
- Toggles completed state for existing `- [ ]` / `- [x]` tasks.
- Edits and deletes task lines in place.
- Opens the source note in Obsidian or reveals it in Finder.

## Setup

1. Run `npm install`.
2. Run `npm run dev`.
3. In Raycast, open `Manage Obsidian Todos`.
4. Set the extension preferences:
   - `Obsidian Vault Folder`: your vault root folder.
   - `ToDo Note Path`: usually `ToDo.md`, or a nested path like `Inbox/ToDo.md`.
   - `Create the note automatically`: enabled by default.
   - `New Todo Placement`: append or prepend.

## Notes

- Relative note paths are resolved from the vault root.
- Absolute note paths also work if you prefer to point at one note directly.
- If the note does not exist and auto-create is enabled, the extension creates a starter note with a heading.
- This extension currently manages markdown checkbox lines and leaves all other note content untouched.