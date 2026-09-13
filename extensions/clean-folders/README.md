# Clean Folders

Downloads pile up quickly, and screenshot-heavy workflows can flood the Desktop just as fast—especially when sharing screen context with AI chats. Clean Folders clears that clutter without permanently deleting anything.

The extension provides two commands:

- **Clean All** moves the contents of every configured folder to the Trash after one confirmation.
- **Clean Folder** lets you pick one configured folder, then hands the cleanup to Clean All for confirmation and execution.

Set **Folders** in the extension preferences to a comma-separated list of paths. A leading `~` is supported, and the default is `~/Downloads, ~/Desktop`. Empty entries and duplicate paths are ignored.

Items only ever go to the macOS Trash, so they remain recoverable. Clean Folders uses `/usr/bin/trash` and has no `rm` path anywhere in its implementation.
