# Vibelet Search

Search and resume Claude Code and Codex sessions from Raycast, across both CLI and desktop app session stores.

## Features

- Search four session sources:
  - Claude Code CLI (`~/.claude`)
  - Claude Desktop (`~/Library/Application Support/Claude/claude-code-sessions`)
  - Codex CLI (`~/.codex`)
  - Codex Desktop (`~/.codex`, detected from `originator = "Codex Desktop"`)
- Search by title or full conversation content.
- Open the matched conversation with the matched message and surrounding context pinned at the top.
- Resume CLI sessions in Terminal.app, iTerm, Ghostty, WezTerm, or Warp.
- Open desktop-app sessions in Claude.app or Codex.app.
- Copy a resume command, Markdown transcript, plain-text transcript, session ID, or project path.

## Command

| Command | Description |
| --- | --- |
| Vibelet Search | Browse and search Claude Code and Codex sessions |

## Actions

- `Return` View conversation, or matched context when searching content
- `Command + O` Open in Claude.app or Codex.app
- `Command + T` Resume in the configured terminal
- `Command + R` Copy Resume Command
- `Command + Shift + R` Copy Resume Command with the CLI permission-skip flag
- `Command + Shift + M` Copy Markdown
- `Command + Shift + P` Copy Plain Text
- `Command + Shift + C` Copy Session ID
- Open Project in Finder, when the session has a project path

## Preferences

- Default Terminal: Terminal.app, iTerm, Ghostty, WezTerm, or Warp.
- Claude CLI Path: override the `claude` executable name or path.
- Codex CLI Path: override the `codex` executable name or path.

## How It Works

The extension reads session files directly from disk:

- Claude Code CLI: `~/.claude/sessions/*.json` plus `~/.claude/projects/<encoded-path>/<session>.jsonl`
- Claude Desktop: `~/Library/Application Support/Claude/claude-code-sessions/<user>/<workspace>/local_*.json`
- Codex CLI and Codex Desktop: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`

### Caching & incremental indexing

Session metadata and full-text content are cached under Raycast's support directory
(`.../vibelet-search/cache/`) so opening the extension and searching stay fast even with
thousands of sessions:

- **Metadata** is cached per source with `mtime + size` fingerprints. On open, only files
  that are new or changed are re-read (just their head, streamed, stopping as soon as the
  title is found) — everything else is served from cache. Cache corruption degrades
  silently to a full rescan.
- **Content search** runs ripgrep over a single merged index file (`messages.txt`), built
  incrementally from per-session segments. A content hit resolves straight to the exact
  message, so opening a matched session jumps to that message highlighted, instead of
  scanning the whole file again.

Title extraction reads only the beginning of each session file. Full messages are loaded
streaming, when a conversation is opened. The first content search downloads the ripgrep
binary into Raycast's support directory if it is not already cached there.

All caches are local, rebuildable from scratch (delete the `cache/` folder), and never
touch the original agent data. Session content stays on your machine and is never uploaded.
