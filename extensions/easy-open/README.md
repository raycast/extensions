# Easy Open

A Raycast extension for macOS that searches directories from multiple root folders and opens them with configured applications or terminal commands.

## Features

- Configure one or more applications with a graphical picker
- Configure one or more command openers with a terminal app
- Optionally close the terminal after the command finishes
- Reorder applications to control the selection priority
- Reorder commands to control the selection priority
- Configure multiple root folders with a graphical directory picker
- Sort directories by recent usage across the full result list
- If one opener is configured, open directly with it
- If multiple openers are configured, choose which one should open the selected directory
- Remove root folders individually from a management view
- List the immediate subdirectories under those root folders
- Search by directory name in Raycast
- Open the selected directory with the configured application

## Configuration

Open the command preferences in Raycast and set:

- `Display Mode`: choose between showing only the directory name or `Root / Directory Name`

Then open the `Easy Open` command and use:

- `Manage Applications` to add, remove, or clear applications
- In `Manage Applications`, use `Move Up` and `Move Down` to change application order
- `Manage Commands` to add, edit, remove, or clear command openers
- `Manage Root Folders` to add, remove, or clear root folders

For command openers:

- choose a terminal app
- configure a command such as `ls -la`
- optionally use `{path}` in the command template, for example `code {path}`
- if `{path}` is omitted, Easy Open appends the selected directory path to the end of the command
- enable `Close After Command` if the terminal window should be one-shot

When only one opener is configured, selecting a directory runs it immediately. When multiple openers are configured, you will first choose which one to use, in the same order shown in the management lists.

Directories that you have opened before are ranked first across the full result list.

## Notes

- Command openers currently support macOS `Terminal`, `iTerm`, and `Ghostty`.
- `Close After Command` is best-effort. `Ghostty` is the most reliable. `Terminal` and `iTerm` may also need their profile configured to close when the shell exits.

## Development

```bash
npm install --include=dev
npm run build
npm run lint
```
