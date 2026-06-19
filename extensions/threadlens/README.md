# Threadlens

Search your local coding-agent sessions from Raycast — across **Codex, Claude Code, Cursor, Pi, OMP, Amp, Droid, OpenCode**, and custom JSONL sources. Nothing leaves your machine.

This extension is a thin UI over the [Threadlens](https://github.com/moinulmoin/threadlens) CLI; it does not index, parse, or rank sessions itself.

## Requirements

Install the Threadlens CLI (no Python required):

```bash
npm install -g threadlens
# or with uv:
uvx threadlens             # run once
uv tool install threadlens # global install
```

The extension looks for `threadlens` on your `PATH` (including `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`). If it's installed elsewhere, set the full path in the **Threadlens Command** preference.

## Usage

Open **Search Agent Sessions** and start typing. Results show the session title, agent, working directory, date, and relevance score. Press Enter on a result for snippets, metadata, and copy/open actions.

Under the hood it calls:

```bash
threadlens search "<query>" --json
threadlens brief "<result_id>" --json
```
