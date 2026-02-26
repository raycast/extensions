# Kill MCP Servers

A Raycast extension to view and manage MCP (Model Context Protocol) servers running on your Mac.

## Features

- **List all running MCP servers** - See all MCP processes currently running on your system
- **View resource usage** - Monitor RAM and CPU usage for each server
- **Identify source application** - Know which application (Claude Desktop, VS Code, Cursor, Claude Code) spawned each server
- **Kill processes** - Gracefully terminate or force kill MCP servers
- **Detailed view** - See full command, configuration path, and more for each server

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) 16.10+ and npm 7.0+ installed
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development mode:
   ```bash
   npm run dev
   ```

## Usage

1. Open Raycast
2. Type "List MCP Servers" or "Kill MCP"
3. Browse running MCP servers
4. Click on a server to see details
5. Use keyboard shortcuts to kill processes:
   - `⌘K` - Kill process gracefully
   - `⇧⌘K` - Force kill process
   - `⇧⌘A` - Kill all MCP servers

## Supported Applications

The extension detects MCP servers from:

- **Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json`
- **VS Code** — `~/Library/Application Support/Code/User/mcp.json`
- **Cursor** — `~/.cursor/mcp.json`
- **Claude Code** — `~/.claude/settings.json`
