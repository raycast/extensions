# Nowledge Mem

Search and browse your personal knowledge base from Raycast. Find memories, save insights, and read your daily Working Memory briefing without leaving your workflow.

## Setup

1. Install and run [Nowledge Mem](https://mem.nowledge.co) desktop app
2. Install this extension from the Raycast Store
3. Choose one connection path:
   - **Local default**: leave settings alone and use the local Mem server at `http://127.0.0.1:14242`
   - **Remote Mem**: set **Server URL** and **API Key** in Raycast preferences, or configure `~/.nowledge-mem/config.json`

The extension now supports the same remote auth shape used across other Nowledge integrations.

```json
{
  "apiUrl": "https://mem.example.com",
  "apiKey": "nmem_your_key"
}
```

## Commands

| Command | Description |
|---------|-------------|
| **Search Memories** | Search your knowledge base with natural language. Shows results ranked by relevance. When empty, shows recent memories. |
| **Add Memory** | Save a quick memory with title, content, and importance level. |
| **Read Working Memory** | Read today's Working Memory briefing from the Mem API. |
| **Edit Working Memory** | Open `~/ai-now/memory.md` in your default editor for quick local edits. |

### Actions

Every memory in search results supports:

- **Copy Content** — copy the full memory text
- **Copy Title** — copy just the title
- **Open in Nowledge Mem** — deep link to the memory in the desktop app

The Working Memory view supports:

- **Copy Working Memory** — copy the full briefing
- **Open in Nowledge Mem** — jump to the app

## What Is Working Memory?

Each morning, Nowledge Mem generates a briefing at `~/ai-now/memory.md` summarizing what you're focused on, what needs attention, and what changed. Connected tools can read it through the API or MCP so your assistant knows your context before you type a word.

## Configuration

| Preference | Default | Description |
|---|---|---|
| Server URL | `http://127.0.0.1:14242` | Nowledge Mem server address. Leave as local default, or point it at your remote Mem URL. |
| API Key | empty | Optional remote Mem API key. Sent as `Authorization: Bearer ...` and `X-NMEM-API-Key`. |

If preferences are empty, the extension also checks `~/.nowledge-mem/config.json` for `apiUrl` and `apiKey`.

## Notes

- **Remote support**: search, add memory, and read Working Memory all support authenticated remote Mem access.
- **Edit Working Memory** remains a local-file convenience command. For remote-only setups, edit through the Nowledge Mem app or API instead.
- **Graph visualization** is available through the desktop app and MCP-native hosts (Claude Code, Codex) which support interactive canvas rendering. Raycast's UI model does not support embedded web views, so graph exploration is not included in this extension.
