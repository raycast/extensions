# Raycast Extension — Agent Notes

Reference for AI agents working on the Jattends Raycast extension.

## Architecture

Single Raycast command ("Switch Claude Session") that lists all active Claude Code sessions, lets you fuzzy-search by project name/path, and jumps to the correct terminal window on Enter.

### Data flow

1. **Claude Code hooks** (`~/.claude/hooks/jattends-hook.sh`) write JSON session files to `~/.claude/jattends/sessions/`
2. Extension reads all `*.json` files via Node `fs` on each open
3. Filters stale (>24h) and dead-PID sessions (cleans up files)
4. Deduplicates by TTY (same TTY = same terminal, keep most recent) and subdirectory
5. Groups by status: Waiting → Working → Ready
6. On Enter: activates the terminal window via OSC title marker or AppleScript fallback

### Key file

**`src/switch-session.tsx`** — the entire extension in one file:

| Section | Purpose |
|---------|---------|
| Types | `SessionInfo`, `ParsedSession`, `SessionStatus` |
| Constants | Session dir path, stale/timeout thresholds, status config (labels, colors), terminal app name map |
| Helpers | `isProcessAlive` (kill -0), `findTtyForSession` (ps + lsof lookup) |
| Session loading | `loadSessions()` — read, filter, dedup, sort |
| Terminal activation | `activateSession()` — OSC marker strategy + AppleScript fallback |
| Command | React component with `List`, `List.Section`, `List.Item`, `ActionPanel` |

## Session JSON format

Written by `jattends-hook.sh` to `~/.claude/jattends/sessions/{sessionId}.json`:

```json
{
  "sessionId": "abc-123",
  "cwd": "/Users/you/project",
  "status": "waiting",
  "terminalApp": "ghostty",
  "terminalPid": 12345,
  "terminalTty": "/dev/ttys000",
  "updatedAt": "2026-02-26T00:00:00Z"
}
```

Status values: `waiting` (needs attention), `active` (Claude working), `idle` (ready for input).

## Session statuses

| Status | Label | Color | Meaning |
|--------|-------|-------|---------|
| `waiting` | Waiting | Orange | Claude needs user input (permission, question) |
| `active` | Working | Green | Claude is generating a response |
| `idle` | Ready | Gray | Session open, waiting for next prompt |

The extension also infers status: if a session is `active` but hasn't been updated in >30s, it's shown as `idle`/Ready.

## Terminal activation strategies

1. **OSC title marker** (primary, terminal-agnostic): Write a unique `\e]2;MARKER\a` escape sequence to the session's TTY, find the window by that title via System Events, raise it, then reset the title. Works with any terminal supporting OSC 2.
2. **AppleScript title matching** (fallback): Search windows by title containing project name or cwd. Works with terminals that expose meaningful window titles (iTerm2, Terminal.app, etc.).

TTY resolution order:
1. `terminalTty` field from session JSON (written by hook)
2. `findTtyForSession()` — scans `ps` for claude processes, matches cwd via `lsof`

## Deduplication logic

1. **Same TTY**: Multiple sessions on the same TTY → keep most recently updated (zombie sessions from previous conversations)
2. **Subdirectory**: Session whose cwd is a child of another session with the same terminal PID → discard (subagent artifacts)

## Dev workflow

```bash
cd raycast-extension
npm install
npm run dev      # Start dev server (auto-reloads in Raycast)
npm run build    # One-off build
npm run lint     # ESLint check
```

## Dependencies

- `@raycast/api` — Raycast UI components
- `@raycast/utils` — `usePromise` for async data loading
- Node builtins: `fs`, `child_process`, `os`, `path`
