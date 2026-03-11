# Changelog

## [Remote Access Support] - {PR_MERGE_DATE}

- **Remote Working Memory**: the Working Memory command now reads from the Mem API, so remote Mem setups work correctly
- **Safer local editing contract**: `Edit Working Memory` now refuses remote connections and stays explicitly local-only
- **Remote auth support**: Raycast can now use `Server URL` + `API Key` preferences or `~/.nowledge-mem/config.json`
- **Removed graph exploration**: Raycast does not support embedded web views needed for interactive graph visualization. Graph exploration is available through the desktop app and MCP-native hosts (Claude Code, Codex).

## [Initial Version] - 2026-02-24

- **Search Memories**: semantic search with relevance scoring, recent memories fallback
- **Add Memory**: save with title, content, and importance from Raycast
- **Working Memory**: rendered markdown view of your daily briefing
- **Edit Working Memory**: opens `~/ai-now/memory.md` in your default editor
- Copy Content and Copy Title actions on all memory items
- Deep link support to open memories in the Nowledge Mem desktop app
