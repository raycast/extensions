# Codex

Start, search, and manage Codex threads directly from Raycast.

Codex is a focused Raycast control surface for the Codex macOS app. It uses local Codex app, CLI, and app-server interfaces to start new work quickly, reopen past threads, search across recent thread metadata and transcript text, and run common thread actions without leaving Raycast.

## Features

- Start a new Codex thread, with or without an initial prompt
- Pick a recent or configured local project when starting a thread with a prompt
- Start a thread from clipboard text
- Search recent active or archived threads by name, project, preview, and indexed transcript text
- Open, resume, rename, summarize, auto-rename, fork, compact, archive, and unarchive threads
- Filter threads by project and show or hide subagent threads
- Copy thread IDs, resume commands, project paths, and latest turns
- Export a Codex thread to Markdown

## Commands

| Command                   | Description                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Search Threads            | Browse, search, resume, rename, summarize, archive, fork, compact, and export Codex threads. |
| New Thread                | Start a new Codex thread. Uses the default project directory preference when configured.     |
| New Thread with Prompt    | Start a new Codex thread with a typed prompt, project picker, and optional custom path.      |
| New Thread from Clipboard | Start a new Codex thread using clipboard text as the initial prompt.                         |
| Open Codex                | Open the Codex app.                                                                          |

## Requirements

- Raycast for macOS
- Codex for macOS, installed and signed in, with a CLI that supports `codex app-server`
- Codex CLI available from the app bundle, `/opt/homebrew/bin/codex`, `/usr/local/bin/codex`, a login shell, or the **Codex CLI Path** preference
- Raycast AI access for the **Summarize Thread** and **Auto Rename** actions

## Setup

1. Install and open Codex for macOS at least once.
2. Leave **Codex CLI Path** empty unless auto-detection cannot find your CLI.
3. Optionally set **Default Project Directory** to an existing local workspace for one-step new thread commands.
4. Optionally set **Projects Folder** to a parent folder whose direct child directories should appear in the **New Thread with Prompt** project picker.

## Preferences

- **Default Project Directory**: optional existing local workspace directory used by one-step new thread commands.
- **Projects Folder**: optional parent folder used to add local project choices to the prompted new-thread picker.
- **Codex CLI Path**: optional absolute path to the Codex CLI when auto-detection cannot find it.

## Notes

This is an unofficial Raycast extension for Codex and is not affiliated with or endorsed by OpenAI. It uses Codex's local app URL scheme, local CLI, and local app-server interfaces where available. Thread exports are written to your Downloads folder.

Transcript search stores local search-index files in Raycast's extension support folder so repeated searches are fast. The cache stays on your Mac and is refreshed when thread metadata changes.
