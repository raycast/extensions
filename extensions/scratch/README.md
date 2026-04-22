# Scratch Raycast Extension

Raycast commands for working with the Scratch CLI.

## Commands

- `New Note`: create a note with an optional folder and body.
- `Search Notes`: browse notes, open a file, copy its path, or delete it.
- `New Task`: create a task with optional description, link, waiting-for, date, or bucket.
- `Search Tasks`: browse tasks, complete/reopen them, open links, copy IDs, or delete them.

## Prerequisite

Install the `scratch` CLI first. The extension shells out to the CLI instead of reimplementing note/task storage.

If the CLI is not on your shell `PATH`, set `Scratch CLI Path` in the extension preferences.

## Publishing

The local build works without an `owner` field in [package.json](/Users/jamie.b/Documents/code/Raycast/scratch/package.json). Add your real Raycast owner slug before publishing to the store.
