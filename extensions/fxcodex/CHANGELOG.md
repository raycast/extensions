# fxCodex Changelog

## [Open Links in Workspaces] - {PR_MERGE_DATE}

- Add **Open Link in Workspace** to deliver a `codex://` link, such as a sign-in callback, to one workspace's Codex. The link comes from the command argument or the clipboard. The command is disabled by default; enable it in Raycast Settings when needed.
- Add **Open Link…** to each workspace's action panel.
- Keep the selected workspace in place when the list refreshes.
- Recommend fxcodex 0.3.1 in the installer; opening links requires it or later.

## [Initial Version] - 2026-08-13

- Manage multiple Codex workspaces and switch between them from Raycast.
- Create, rename, delete, open, and inspect workspaces.
- Discover, install, select, update, and remove fxCodex executables without bundling the CLI.
- Install verified GitHub releases for the current user, in extension support, with Homebrew, or in a custom directory.
- Customize workspace icons using Raycast icons or appearance-specific image files.
- Inspect extension status and copy diagnostics even when the CLI is unavailable.
