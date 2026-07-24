# Threadlens

Search your local coding-agent sessions from Raycast — across **Codex, Claude Code, Cursor, Pi, OMP, Amp, Droid, OpenCode**, and custom JSONL sources. Nothing leaves your machine.

This extension is a thin UI over the [Threadlens](https://github.com/moinulmoin/threadlens) CLI; it does not index, parse, or rank sessions itself.

## Requirements

Install the Threadlens CLI:

```bash
uv tool install threadlens # recommended; installs a managed Python if needed
# or:
pipx install threadlens
```

The extension looks for `threadlens` on your `PATH` (including `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`). If it's installed elsewhere, set the full path in the **Threadlens Command** preference.

Optional preferences:

- **Threadlens Args** — extra CLI args inserted before the subcommand
- **Working Directory** — cwd used when spawning Threadlens

## Usage

Open **Search Agent Sessions** and start typing (at least 2 characters). Results show the session title, working directory, agent, and date. Press Enter on a result to open details with snippets, metadata, and copy/open actions.

Under the hood it calls:

```bash
threadlens search "<query>" --json --no-bootstrap
threadlens brief "<result_id>" --json
```
