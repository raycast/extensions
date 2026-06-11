# Codex Desktop

Search local Codex sessions and projects from Raycast, then open them in Codex Desktop.

## Features

- Search local Codex sessions from Raycast
- Open a selected session in Codex Desktop with the matching project folder loaded first
- Resume a selected session in Terminal
- Copy a session's CLI resume command, thread URL, ID, session file path, or raw JSONL contents
- Browse local Codex projects from Raycast
- Read project history from the local Codex state database at `~/.codex/state_*.sqlite`
- Open the most recent Codex thread waiting on you, with a latest-thread fallback
- Open a workspace directly in the Codex macOS app with the `codex://new?path=...` deeplink
- Jump to a project's Git remote in the browser when Codex has stored it

## Requirements

- macOS with [Raycast](https://www.raycast.com/)
- [Codex for macOS](https://developers.openai.com/codex/app) installed
- A local Codex home directory with sessions in `~/.codex/sessions` or `$CODEX_HOME/sessions`

## Usage

Codex Desktop includes three commands:

- `Search Sessions` searches your local Codex session JSONL files and opens the selected thread in Codex Desktop
- `Projects` searches your recent Codex workspaces and opens the selected path in the Codex desktop app
- `Open Latest Attention Thread` opens the most recent thread waiting on user input or approval, then falls back to the latest non-archived thread

## Codex Notes

- Project discovery is driven by the local Codex `threads` table, grouped by `cwd`
- Session discovery is driven by `session_index.jsonl` plus recursive JSONL files under `sessions/`
- The attention-thread command reads live `thread/list` data from the local Codex app-server rather than the stale `codex-dev.db` inbox cache
- The extension filters out missing directories and the placeholder `/` workspace
- If your Codex profile lives somewhere else, set `CODEX_HOME` before launching Raycast
