# Claude Resume

> Resume any Claude Code session by its first prompt, from Raycast.

`Claude Resume` indexes every session log under `~/.claude/projects/*/*.jsonl`, shows the actual first user prompt as a sprechender title, and reopens the one you pick in iTerm2 or Terminal with `claude --resume <uuid>` — one keystroke, no UUID hunting.

## Why a separate extension from "Claude Sessions"?

[`claude-sessions`](https://www.raycast.com/kud/claude-sessions) lists Claude's **project directories** from `~/.claude.json` and resumes them with `claude --continue` (most recent session in that project).

`Claude Resume` works on a **finer granularity**: each individual conversation log file. If you started five different chats in the same project, you see five list items here — each labeled with what you actually asked. Then you resume that exact one by UUID.

Pick whichever matches your mental model. They live happily side-by-side.

## Features

- 🔍 **Search** across title, working directory, session ID
- 📋 **Detail panel** with the full first user message
- ⌨️ **Resume in iTerm2 or Terminal.app** (configurable default)
- 📎 **Copy** the resume command, session identifier, working directory, or log path
- 📂 **Show log file in Finder** or open in default editor
- ⚡ Cached with mtime-invalidation — warm reload < 100ms even with 1000+ sessions

## Preferences

| Preference | Default | Notes |
|---|---|---|
| Terminal App | iTerm2 | iTerm2 or Terminal.app |
| Session Limit | 50 | Max sessions to load (10–500) |
| JSONL Root Path | `~/.claude/projects` | Custom Claude installs |

## Troubleshooting

### "Failed to open terminal"
macOS requires Automation permission for Raycast to control iTerm/Terminal. Open:
**System Settings → Privacy & Security → Automation → Raycast → enable iTerm/Terminal**

### `claude: command not found` after resume
The non-login shell that AppleScript spawns might not have `claude` in PATH. Make sure your `~/.zshrc` exports it:
```bash
export PATH="$HOME/.claude/local/bin:$PATH"
```

### Empty list
- Verify the JSONL root path in preferences (default `~/.claude/projects`).
- Start a session in Claude Code first — until you do, there are no JSONLs to list.
- Check that the path exists: `ls ~/.claude/projects/`.

## Limitations

- macOS only (Raycast itself is macOS-only)
- Loads max 500 sessions — increase via preferences if needed
- Sessions without a string-content first user message show as "(empty session)"

## Development

```bash
git clone https://github.com/gbechtold/raycast-claude-resume.git
cd raycast-claude-resume/extension
npm install
npm run dev    # Hot-reload in Raycast
npm run build  # Verify build
npm run lint   # Lint + Prettier
```

## License
MIT
