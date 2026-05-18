# Ollama + MCP Chat — Raycast Extension

Chat with local Ollama models enhanced with MCP (Model Context Protocol) tool support, directly from Raycast.

Run powerful local AI conversations with access to your MCP tools — reminders, calendars, file systems, and any other MCP-compatible server — all without leaving your keyboard.

## Features

- **Local AI Chat** — Talk to any Ollama model installed on your machine
- **MCP Tool Integration** — Connect to MCP servers for tool-augmented conversations (e.g., Reminders, Calendar, file system access)
- **Streaming Responses** — Real-time token-by-token streaming from Ollama
- **Graceful Degradation** — Works without MCP tools if the bridge is not running; works without Ollama if it's not available (shows helpful messages either way)
- **Start MCP Bridge** command — One-click bridge server management from Raycast

## Prerequisites

- **[Ollama](https://ollama.com)** — Local LLM runtime. Install and pull at least one model:
  ```bash
  brew install ollama
  ollama pull llama3.1
  ollama serve
  ```
- **[Raycast](https://raycast.com)** — macOS productivity launcher
- **(Optional) MCP Servers** — Any stdio-based MCP server (e.g., Apple Reminders, Calendar, Brave Search)

## Installation

### From Raycast Store

Search for "Ollama + MCP Chat" in the Raycast Store and install.

### From Source

```bash
git clone https://github.com/gardnerscot/raycast-extensions
cd raycast-extensions/extensions/ollama-mcp-chat
npm install
npm run dev
```

## Setup

### 1. Configure Ollama

Make sure Ollama is running:

```bash
ollama serve
```

The extension defaults to `http://localhost:11434`. If your Ollama instance runs elsewhere, update the **Ollama API URL** in extension preferences.

### 2. (Optional) Configure MCP Tools

MCP tools require a bridge server that connects to stdio-based MCP servers and exposes them over HTTP.

Create an MCP configuration file at `~/Library/Application Support/memu-bot/mcp-config.json` (or update the path in preferences):

```json
{
  "reminders": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-reminders"],
    "env": {}
  },
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-filesystem", "/Users/you/Documents"],
    "env": {}
  },
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-brave-search"],
    "env": {
      "BRAVE_API_KEY": "your-api-key-here"
    }
  }
}
```

Each key is a server name. The value is an object with:
- `command` — The executable to run (e.g., `npx`, `node`, `/usr/bin/python3`)
- `args` — Command-line arguments (array)
- `env` — Environment variables (object, optional)
- `disabled` — Set to `true` to skip this server (optional)

### 3. Start the MCP Bridge

From Raycast, run the **Start MCP Bridge** command. This spawns the bridge server as a background process on port 3100.

Alternatively, start it manually:

```bash
node mcp-bridge.js --config ~/Library/Application\ Support/memu-bot/mcp-config.json
```

## Usage

### Ollama + MCP Chat

1. Open Raycast and search for "Ollama + MCP Chat"
2. Select a model from the list
3. Press **Enter** to compose a message
4. If MCP tools are connected, the model can call them automatically

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Enter** | Send a new message |
| **Cmd+T** | View available MCP tools |
| **Cmd+C** | Copy the last response |
| **Cmd+K** | Clear the chat |
| **Cmd+.** | Stop a running response |

### MCP Config File Format

The config file is a JSON object where each key is a server name:

```json
{
  "server-name": {
    "command": "executable",
    "args": ["arg1", "arg2"],
    "env": {
      "KEY": "value"
    },
    "disabled": false
  }
}
```

### Example: Apple Reminders + Calendar

```json
{
  "reminders": {
    "command": "node",
    "args": ["/path/to/mcp-reminders-server/index.js"]
  },
  "calendar": {
    "command": "node",
    "args": ["/path/to/mcp-calendar-server/index.js"]
  }
}
```

## Troubleshooting

### "Ollama not reachable"
- Make sure Ollama is running: `ollama serve`
- Check that the URL in preferences matches your Ollama instance
- Verify with: `curl http://localhost:11434/api/tags`

### "Bridge not running"
- Run the **Start MCP Bridge** command from Raycast
- Or manually: `node mcp-bridge.js`
- Check the MCP config file exists and is valid JSON
- Make sure Node.js is installed: `node --version`

### Tools not showing up
- Verify the MCP config file path in extension preferences
- Check that the MCP servers specified in the config are installed
- Look at bridge server logs for connection errors

### Model doesn't call tools
- Not all models support tool calling — try `llama3.1` or `mistral`
- Make sure the bridge is running and tools are loaded
- Use **Cmd+T** to verify tools are available

## Links

- **GitHub:** [https://github.com/gardnerscot/raycast-extensions](https://github.com/gardnerscot/raycast-extensions)
- **SG1 Labs:** [https://sg1-labs.us](https://sg1-labs.us)
- **Ollama:** [https://ollama.com](https://ollama.com)
- **Raycast:** [https://raycast.com](https://raycast.com)
- **Model Context Protocol:** [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

## License

MIT
