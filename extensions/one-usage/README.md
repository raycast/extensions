# One Usage

Track your AI coding tool usage — [Claude](https://claude.ai), [Codex](https://chatgpt.com), and [Cursor](https://cursor.sh) — all in one place.

## Features

- **View Usage** — See usage details for all enabled providers in a Raycast list: plan type, rate-limit windows, spend tracking, and reset countdowns. Open **Usage Dashboard** or **Status Page** per provider from the action panel.
- **Menu Bar Usage** — Keep usage visible in the macOS menu bar. Shows all providers (e.g. one percentage per provider) or a single pinned provider (e.g. `45%`), with configurable refresh intervals.
- **Pin to Menu Bar** — From View Usage, pin any provider to the menu bar via the action panel (`⌘⇧P`). Use **Show All in Menu Bar** (`⌘⇧A`) to show all providers again.
- **Reorder Providers** — In View Usage, change the order of providers with **Move to Top** (`⌘⇧T`), **Move Up** (`⌘↑`), and **Move Down** (`⌘↓`). Order is shared with the menu bar dropdown.

### What Each Provider Shows

| Provider | Metrics                                                                                 |
| -------- | --------------------------------------------------------------------------------------- |
| Claude   | Plan type, Session (5h) %, Weekly (7d) %, Opus %, Extra (dollar spend vs monthly limit) |
| Codex    | Plan type, Session %, Weekly %, Reviews % (code review), Credits balance                |
| Cursor   | Plan name, Usage %, Included spend ($), On-demand spend ($)                             |

Progress metrics show a “Resets in X” countdown when the provider supplies a reset time.

## Setup

This extension reads locally stored credentials from each AI tool. **No API keys or manual tokens are needed** — sign in to each tool as usual.

### Claude

Sign in to [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (e.g. via the `claude` CLI). The extension resolves credentials in this order:

1. **macOS Keychain** — `Claude Code-credentials` (preferred)
2. **File** — `~/.claude/.credentials.json`

### Codex

Sign in to [Codex](https://chatgpt.com) via the Codex CLI (`codex`). The extension reads your auth token from `~/.codex/auth.json`.

### Cursor

Sign in to [Cursor](https://cursor.sh) in the editor. The extension reads the session token from Cursor’s local SQLite DB at `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`. If the token is expired, it is refreshed automatically using the stored refresh token.

## Development

```bash
npm install
npm run dev      # Run in Raycast development mode
npm run build    # Build the extension
npm run lint     # Lint
npm run fix-lint # Lint with auto-fix
```
