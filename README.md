# MCP Server Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Raycast](https://img.shields.io/badge/Raycast-FF6363?logo=raycast&logoColor=white)](https://raycast.com/)

A Raycast extension for managing MCP *(Model Context Protocol)* servers across editors.

![Demo](assets/demo.gif)

Editing `JSON` configs manually is tedious and error-prone. This gives you forms with validation, search, connection testing, and some basic server protections.

*The code is functional but not particularly elegant. Pull requests welcome.*

## Table of Contents

- [What is this?](#what-is-this)
- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Usage](#usage)
- [Supported Editors](#supported-editors)
- [Transport Types](#transport-types)
- [Server Protection](#server-protection)
- [Contributing](#contributing)
- [License](#license)

## What it does

- CRUD operations for MCP server configs across editors
- Search and filter servers
- Connection testing with timeout handling
- Basic protection against deleting critical servers (UI only - raw config editing bypasses this)
- Transport support: `stdio`, `SSE`, `HTTP`

## Supported editors

- **`Cursor`**: `stdio`, `SSE`
- **`VS Code`**: `stdio`, `SSE`, `HTTP` (includes input management for secrets)
- **`Windsurf`**: `stdio`, `/sse`

## Installation

Raycast Store:

1. Navigate to the Raycast Store.
2. Search for `MCP Server Manager`
3. Click Install

Manual:
```bash
git clone https://github.com/rmncldyo/raycast-mcp-server-manager.git
```
```bash
cd raycast-mcp-server-manager
```
```bash
npm install
```
```bash
npm run build
```
```bash
npm run dev
```

## Development Requirements

- Raycast ≥ `1.50.0`
- Node.js ≥ `18.0.0`
- At least one supported editor

## Usage

Type "MCP" in `Raycast`:

- **List MCP Servers** - View all servers
- **Add MCP Server** - Create new server config
- **Search MCP Servers** - Find servers across editors
- **Remove MCP Server** - Delete servers (with protection)
- **View Raw Configs** - Direct file editing

## Editor Support

### `Cursor`
- Transports: `stdio`, `SSE`
- Config: `~/.cursor/mcp.json` (global), `.cursor/mcp.json` (workspace)
- Notes: No disabled state support

### `VS Code`
- Transports: `stdio`, `SSE`, `HTTP`
- Config: `~/Library/Application Support/Code/User/settings.json` (user), `.vscode/settings.json` (workspace)
- Features: Input management for secrets, environment files, root paths

### `Windsurf`
- Transports: `stdio`, `/sse`
- Config: `~/.windsurf/mcp.json` (global), `.windsurf/mcp.json` (workspace)
- Notes: Max 100 tools, custom `SSE` implementation

## Transport Types

### `stdio`
Local process execution. Command + args + environment variables.

```json
{
  "name": "local-server",
  "transport": "stdio",
  "command": "python",
  "args": ["-m", "my_mcp_server"],
  "env": {"API_KEY": "your-key"}
}
```

### `SSE` (Server-Sent Events)
Remote `HTTP` connection with event streaming.

```json
{
  "name": "remote-service",
  "transport": "sse",
  "url": "https://api.example.com/mcp"
}
```

### `HTTP`
Standard `HTTP` request/response.

```json
{
  "name": "api-service",
  "transport": "http",
  "url": "http://localhost:8000/mcp"
}
```

### `SSE (Windsurf)` (`/sse`)
`Windsurf`'s custom `SSE` implementation. *The url is expected to end with `/sse`.*

```json
{
  "name": "windsurf-service",
  "transport": "/sse",
  "serverUrl": "https://api.example.com/sse"
}
```

## Server Protection

Prevents accidental deletion of critical servers through the UI only.

**Protected by default:** `mcp-server-time` and other system servers
**Protection scope:** List/Search/Remove commands only
**Not protected:** Raw config editor, manual file editing, external tools

Don't rely on this if you're editing configs directly. You break it, you own it.

## Configuration Files

| Editor | Global | Workspace |
|--------|--------|-----------|
| `Cursor` | `~/.cursor/mcp.json` | `.cursor/mcp.json` |
| `VS Code` | `~/Library/Application Support/Code/User/settings.json` | `.vscode/settings.json` |
| `Windsurf` | `~/.windsurf/mcp.json` | `.windsurf/mcp.json` |

---

`VS Code` input management example:

```json
{
  "inputs": [{
    "id": "api-key", 
    "type": "promptString", 
    "description": "API Key", 
    "password": true
  }],
  "servers": {
    "secure-server": {
      "command": "python",
      "args": ["-m", "server"],
      "env": {"API_KEY": "${input:api-key}"}
    }
  }
}
```

## Troubleshooting

- **Extension not loading:** Check `Raycast` version ≥`1.50.0`, restart `Raycast`
- **Servers missing:** Verify config files exist, check `JSON` syntax, verify permissions
- **Connection failures:** Test server accessibility, verify commands work, check environment variables

[Issues](https://github.com/rmncldyo/raycast-mcp-server-manager/issues) | [Discussions](https://github.com/rmncldyo/raycast-mcp-server-manager/discussions)

## Contributing

Code works but could be cleaner. PRs welcome.

**Needs work:**
- Refactoring (it's messy)
- Bug fixes
- New editor support
- Error handling
- Tests

Fork, fix, PR. No bureaucracy.

## License

MIT License - see [LICENSE](LICENSE)

---

Made with ❤️ by RMNCLDYO