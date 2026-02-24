# Nowledge Mem

Search and browse your personal knowledge base from Raycast. Find memories, save insights, and read your daily Working Memory briefing without leaving your workflow.

## Setup

1. Install and run [Nowledge Mem](https://mem.nowledge.co) desktop app
2. Install this extension from the Raycast Store

The extension connects to the Nowledge Mem server running locally on your machine.

## Commands

| Command                 | Description                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Search Memories**     | Search your knowledge base with natural language. Shows results ranked by relevance. When empty, shows recent memories. |
| **Add Memory**          | Save a quick memory with title, content, and importance level.                                                          |
| **Working Memory**      | View today's daily briefing — active topics, flags, and recent changes.                                                 |
| **Edit Working Memory** | Open `~/ai-now/memory.md` in your default editor for quick edits.                                                       |

### Actions

Every memory in search results supports:

- **Copy Content** — copy the full memory text
- **Copy Title** — copy just the title
- **Open in Nowledge Mem** — deep link to the memory in the desktop app

The Working Memory view supports:

- **Edit in Default Editor** — opens the file for editing
- **Copy Working Memory** — copy the full briefing
- **Open in Nowledge Mem** — jump to the app

## What Is Working Memory?

Each morning, Nowledge Mem generates a briefing at `~/ai-now/memory.md` summarizing what you're focused on, what needs attention, and what changed. Any AI tool connected via MCP (Claude Code, Cursor, Codex) reads this file at session start — your assistant knows your context before you type a word.

## Configuration

| Preference | Default                  | Description                 |
| ---------- | ------------------------ | --------------------------- |
| Server URL | `http://127.0.0.1:14242` | Nowledge Mem server address |
