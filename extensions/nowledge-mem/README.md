# Nowledge Mem

Search and browse your personal knowledge base from Raycast. Find memories, save insights, and read your daily Working Memory briefing without leaving your workflow.

## Setup

1. Install and run [Nowledge Mem](https://mem.nowledge.co) desktop app
2. Install this extension from the Raycast Store
3. Choose one connection path:
   - **Local default**: leave settings alone and use the local Mem server at `http://127.0.0.1:14242`
   - **Remote Mem**: set **Server URL** and **API Key** in Raycast preferences, or configure `~/.nowledge-mem/config.json`
4. Optional: set **Space** in Raycast preferences if this profile should stay in one named memory lane

The extension now supports the same remote auth shape used across other Nowledge integrations.

```json
{
  "apiUrl": "https://mem.example.com",
  "apiKey": "nmem_your_key",
  "space": "Research Agent"
}
```

## Commands

| Command | Description |
|---------|-------------|
| **Search Memories** | Search your knowledge base with natural language. Shows results ranked by relevance. When empty, shows recent memories from the configured space. |
| **Add Memory** | Save a quick memory with title, content, and importance level into the configured space. |
| **Read Working Memory** | Read today's Working Memory briefing from the Mem API, following the configured space if one is set. |
| **Edit Working Memory** | Open the Default Working Memory file in your default editor for quick local edits. |

### Actions

Every memory in search results supports:

- **Copy Content** — copy the full memory text
- **Copy Title** — copy just the title
- **Open in Nowledge Mem** — deep link to the memory in the desktop app

The Working Memory view supports:

- **Copy Working Memory** — copy the full briefing
- **Open in Nowledge Mem** — jump to the app

## What Is Working Memory?

Each morning, Nowledge Mem generates a Working Memory briefing summarizing what you're focused on, what needs attention, and what changed. The Default space keeps `~/ai-now/memory.md`; connected tools read the right briefing through the API or MCP when they know the active lane.

## Configuration

| Preference | Default | Description |
|---|---|---|
| Server URL | `http://127.0.0.1:14242` | Nowledge Mem server address. Leave as local default, or point it at your remote Mem URL. |
| API Key | empty | Optional remote Mem API key. Sent as `Authorization: Bearer ...` and `X-NMEM-API-Key`. |
| Space | empty | Optional fixed space name for this Raycast profile. Leave empty to use `~/.nowledge-mem/config.json` if it defines a space, or `Default` if it does not. |

If preferences are empty, the extension also checks `~/.nowledge-mem/config.json` for `apiUrl`, `apiKey`, and `space`.

## Spaces

Raycast is a launcher, not a multi-agent harness. The right model here is one optional fixed lane:

- Leave **Space** empty to follow `~/.nowledge-mem/config.json` when it defines a lane, or `Default` when it does not
- Set **Space** when this Raycast profile always belongs to one stable lane, such as `Research Agent` or `Personal`
- Do not expect Raycast to derive per-agent routing on its own

`Edit Working Memory` remains a local convenience command for the **Default** file at `~/ai-now/memory.md`. If you configure another space, read it through the API-backed command and edit it in the Mem app.

## Notes

- **Remote support**: search, add memory, and read Working Memory all support authenticated remote Mem access.
- **Space-aware recall**: Search, Add Memory, and Read Working Memory follow the optional fixed space from Raycast preferences or `~/.nowledge-mem/config.json`.
- **Edit Working Memory** remains a local-file convenience command for the Default space. For remote-only setups, or for other spaces, edit through the Nowledge Mem app or API instead.
- **Graph visualization** is available through the desktop app and MCP-native hosts (Claude Code, Codex) which support interactive canvas rendering. Raycast's UI model does not support embedded web views, so graph exploration is not included in this extension.
