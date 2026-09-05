# Copy as File Link

A Raycast extension that copies files and folders as `file:///` links to your clipboard.

## Commands

### Copy as File Link
Copies the currently selected Finder items as `file:///` URLs.
- If you pass POSIX paths as arguments, those are used instead of the Finder selection.
- Selecting multiple items copies one link per line.
- Paths are percent-encoded (spaces, special chars) so links work in browsers, chat apps, and notes.

### Copy as File Link (Front Finder Window)
Copies the folder shown in the frontmost Finder window (falls back to Desktop if no window is open).

## How to use
1. Open Finder and select a file, folder, or multiple items.
2. Trigger Raycast → "Copy as File Link".
3. The `file:///...` link is on your clipboard — paste anywhere.

## Notes
- `file:///` links open locally in browsers, Slack, Discord, Notion, Obsidian, etc. They only work on the machine where the file exists.
- Folders open in Finder when clicked.