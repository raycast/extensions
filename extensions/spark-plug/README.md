# Spark Plug — Raycast Extension

Launch Claude Code sessions in your worktrees from Raycast.

Mirrors the [Spark Plug menubar app](https://github.com/kylescudder/spark-plug):

- Lists subdirectories of a configured root folder
- **New** — prompts for a session name, then runs `claude -n "<name>"` in Terminal
- **Continue** — submenu of existing sessions (shows custom titles or first user message, with relative time and a `● live` indicator)
- **Delete** — submenu mirroring Continue; removes the `.jsonl` transcript with a confirmation prompt
- **Open Folder in Finder** — opens the worktree itself

## Setup

1. Install dependencies and start dev mode: `bun install && bun run dev` from the project root. That symlinks the extension into Raycast.
2. Set the **Worktrees Folder** preference to the directory containing your worktrees (e.g. `~/worktrees`).
3. Ensure the `claude` CLI is on your PATH inside Terminal.app.

## Development

```sh
bun install
bun run dev      # symlinks the extension into Raycast for live reload
bun run lint
bun run build    # produces dist/ for store submission
bun run publish  # submits to the Raycast store
```

## How session detection works

Claude Code stores session transcripts at `~/.claude/projects/<encoded-path>/<session-id>.jsonl`. The directory name is the worktree path with every non-alphanumeric character replaced by a hyphen. Live sessions register themselves under `~/.claude/sessions/<pid>.json` while running. Spark Plug reads both to build the worktree list and badge.

Session names use Claude Code's native `-n, --name` flag, which writes a `custom-title` line into the transcript. No sidecar metadata needed.
