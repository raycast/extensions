# Peon Ping (Raycast)

Raycast extension to toggle peon-ping system-wide and optionally show a menu bar status icon.

## Setup

Install peon-ping locally so the hook script exists at:

`~/.claude/hooks/peon-ping/peon.sh`

(If you use a different Claude config root, the path is `<CLAUDE_CONFIG>/hooks/peon-ping/peon.sh`.)

**Config file:** `~/.claude/hooks/peon-ping/config.json` by default (same folder as `peon.sh`).

**Override Claude config directory:** In Raycast extension preferences, set **Claude config directory**, or set `CLAUDE_CONFIG_DIR` in your environment. Resolution order is preference → `CLAUDE_CONFIG_DIR` → `~/.claude`.

**If `peon.sh` is missing:** Toggle shows an error that peon-ping is not installed at the expected script path.

**Menu bar:** The optional menu bar command is **macOS-only** (Raycast menu bar commands are not supported on other platforms).

## Development

- `bun install`
- `bun run dev` -- run in Raycast developer mode
- `bun run test`
- `bun run lint`
- `bun run build`
