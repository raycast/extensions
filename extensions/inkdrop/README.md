# Inkdrop for Raycast

This is a [Raycast](https://www.raycast.com/) extension for [Inkdrop](https://www.inkdrop.app/).

## How to use

### Inkdrop

This extension accesses your notes via HTTP locally.
You have to configure the Inkdrop app to open a HTTP endpoint.
See [the instruction on the documentation](https://docs.inkdrop.app/manual/accessing-the-local-database/#accessing-via-http-advanced) for more detail.

### Raycast

Install extension from [Raycast Store](https://www.raycast.com/yaeda/inkdrop), then set Inkdrop's configuration.

## Features

### Create Note

- Select notebook, status, and tags
- <kbd>Cmd</kbd> + <kbd>Enter</kbd> will create note
- "Open in Inkdrop" toast action after creation (<kbd>Cmd</kbd> + <kbd>O</kbd>)

### Search Notes

- Incremental search using the same keywords as the Inkdrop app
  - Ref. [Searching Notes | Inkdrop Documentation](https://docs.inkdrop.app/manual/searching-notes/#filter-notes-with-special-qualifiers)
- Quick Look for full-screen note preview
- Sort by updated, created, or title (ascending/descending)
- Markdown preview with embedded image support
- Rich actions: copy content, copy title, paste content, copy Markdown link, copy Inkdrop link
- Delete notes with confirmation dialog
- <kbd>Enter</kbd> opens Quick Look, <kbd>Cmd</kbd> + <kbd>Enter</kbd> opens the note in Inkdrop

## Preferences

### General Settings

- Configuration of Inkdrop's local server (`address`, `port`, `username` and `password`)
  - See [the instruction of Inkdrop app](https://docs.inkdrop.app/manual/accessing-the-local-database/#accessing-via-http-advanced)

## Credit

Inkdrop wordmark and logo are registered trademarks owned by Takuya Matsuyama.
