# cmux

## [Fix CLI lookup without PATH install] - {PR_MERGE_DATE}

- Fall back to the cmux CLI bundled in `cmux.app` when it isn't installed into PATH, fixing `spawn cmux ENOENT`
- Document that cmux's Socket Control Mode must be set to Automation mode for Raycast to connect
- Remove the reserved `⌘↵` shortcut from Show Surfaces; it is the second action, so Raycast already assigns `⌘↵` to it
- Use the same `cmux.app` copy for the CLI and for opening the app, preferring the one that is running
- Show how to fix cmux's Access denied error instead of "cmux is not running"

## [Improved workspace search] - 2026-05-27

- Added workspace metadata from `cmux tree --all --json` for better matching
- Search Workspaces now matches workspace descriptions and surface titles
- Falls back to text parser when JSON output is unavailable

## [Improve workspace search] - 2026-05-20

- Include workspace descriptions and open surface details when searching workspaces.

## [Fix PATH resolution] - 2026-04-24

- Fix `spawn cmux ENOENT` errors in Raycast by injecting Homebrew paths into the environment used for CLI calls (covers both Intel `/usr/local/bin` and Apple Silicon `/opt/homebrew/bin`)

## [Initial Version] - 2026-04-10

- Search and jump to a workspace in cmux
- View surfaces for a workspace directly from Search Workspaces with `Cmd+Enter`
- Search and focus a surface (tab) across any workspace
- Jump to the latest notification in cmux
- Create a new workspace and focus it automatically
