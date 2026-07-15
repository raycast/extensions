# Claude Sessions

Browse and manage all your Claude Code sessions from Raycast — no setup required.

## What it does

Claude Sessions auto-discovers every project and chat session Claude Code has ever opened, reads their last activity from conversation history, and presents them in a single searchable list. Pick one, press Enter, and you're back in context.

## Commands

### Browse Sessions

Lists all sessions sorted by most recent activity, grouped into **Chat** and **Code** sections.

- **Search** — type to filter by session name or path
- **Filter** — use the dropdown to show only Chat or Code sessions
- `↵` **Open Session** — opens a new iTerm tab and resumes the session with `claude --continue`
- `⌘N` **New Chat** — name a new chat session and open it immediately
- `⌃X` **Delete Session** — remove a session and trash its history (with confirmation)
- `⌘⇧C` **Copy Path** — copy the session directory to clipboard
- `⌘⇧F` **Show in Finder** — reveal the directory in Finder

### Clean Sessions

Scans your Claude data for stale entries and lets you remove them in bulk.

| Category       | What it means                                                       |
| -------------- | ------------------------------------------------------------------- |
| **Ghost**      | Project directory was deleted but Claude still has a registry entry |
| **No history** | Entry exists but no conversation files were ever written            |
| **Orphaned**   | Conversation files exist with no matching registry entry            |

- `↵` **Remove This** — remove a single entry (with confirmation)
- `⌃⇧X` **Remove All in Group** — remove every entry of that category at once

## Requirements

- [Claude Code](https://claude.ai/code) installed and used at least once
- [iTerm2](https://iterm2.com) (currently the only supported terminal)

## Common Questions

**Why don't I see any sessions?**
Claude Code must have been run at least once to populate `~/.claude.json`. Sessions only appear after you've opened a project in Claude Code.

**What is a "chat" session vs a "code" session?**
Chat sessions live in `~/.chats/` and are standalone conversations. Code sessions are tied to a specific project directory on disk.

**Can I use a different terminal?**
Ghostty, Warp, and Terminal.app are supported via the extension preferences. iTerm2 is the default.

**The session shows "new" instead of a time — is that normal?**
Yes. A session marked "new" exists as a directory but has no conversation history yet. It was created but never actually used in Claude Code.
