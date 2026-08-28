# Quick AirDrop Changelog

## [Received Files] - 2026-08-27

- Add `Copy Last AirDropped File` command to copy the most recently received file to the clipboard
- Add `Paste Last AirDropped File` command to paste the most recently received file into the frontmost app
- Add `Search AirDropped Files` command to browse everything received via AirDrop, with copy, paste, and open actions
- When the last transfer contained several files, the copy/paste commands open a picker scoped to that transfer
- Copying puts the file URL, the shell-escaped path, and (for single images) a downscaled PNG on the clipboard, so Finder, terminals, and image-only apps can all paste it
- Pasting into a terminal inserts the file's path instead of the file, since a simulated paste can only deliver text there
- The search view can move a file — or the whole latest transfer, with confirmation — to the Trash, refreshing the list afterwards

## [Initial Version] - 2026-06-09

- Add `AirDrop Selected File` command for sharing Finder selections
- Add `AirDrop Clipboard` command for files, URLs, and text on the clipboard
- Add `AirDrop Browser Tab` command for the active browser tab's URL
- Add `AirDrop Selected Text` command for the text highlighted in the frontmost app
