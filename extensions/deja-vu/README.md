# deja-vu

Search, inspect, and resume sessions across Claude Code, Codex, Cursor, OpenCode, Gemini CLI, Aider, Windsurf, Copilot, Qwen Code, and 34 more coding agents on your Mac.

## Prerequisites

Install the [`deja-vu`](https://github.com/vshulcz/deja-vu) CLI on your Mac:

```sh
brew install deja-vu && deja install --auto
```

If `deja` is installed outside `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, or `~/go/bin`, set the **deja Binary Path** in the extension preferences.

## Commands

- **Search Sessions**: Full-text search across every coding agent session on your Mac, separating exact matches from nearest-session relevance hits.
- **Recent Sessions**: Browse the 100 most recent sessions across all installed agents with metadata preview (`Agent`, `Project`, `Started`, `Updated`, `Session ID`).

## Actions

- **Show Session**: Read the redacted conversation inside Raycast.
- **Resume in Terminal**: Run the agent's native resume command in `Terminal.app`.
- **Copy Resume Command**, **Copy Session ID**, and **Open Project Folder**.
