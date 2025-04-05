# MCP Manager

A Raycast extension for managing MCP (Minecraft Control Protocol) settings for Cursor and Claude. This extension allows you to create, manage, and apply MCP tools and agents to both Cursor and Claude applications.

## Features

### MCP Tools Management

- Create and manage MCP tools with JSON configuration
- Add descriptions to tools for better organization
- Apply tools directly to Cursor
- Preview JSON content before saving

### MCP Agent Management

- Create agents by combining multiple MCP tools
- Add descriptions to agents
- Apply agents to both Cursor and Claude
- Preview merged JSON content

## Installation

1. Install the extension from Raycast Store
2. The extension will automatically create necessary directories:
   - `~/Library/Application Support/Raycast/extensions/mcp-manager/data` for MCP tools
   - `~/Library/Application Support/Raycast/extensions/mcp-manager/data/templates` for MCP agents

## Usage

### Managing MCP Tools

1. Open Raycast and search for "MCP Tools"
2. Click "Create New MCP Tools" or use the shortcut (⌘N)
3. Enter a name and description for your tools
4. Add your JSON configuration
5. Save or apply directly to Cursor

### Managing MCP Agents

1. Switch to "MCP Agent" view using the dropdown
2. Select multiple MCP tools to create an agent
3. Click "Save as MCP Agent"
4. Enter a name and description for your agent
5. Apply the agent to both Cursor and Claude

## File Structure

- MCP Tools: `~/Library/Application Support/Raycast/extensions/mcp-manager/data/*.json`
- Tool Descriptions: `~/Library/Application Support/Raycast/extensions/mcp-manager/data/*.json.description`
- MCP Agents: `~/Library/Application Support/Raycast/extensions/mcp-manager/data/templates/*.json`

## Requirements

- macOS
- Raycast
- Cursor (optional)
- Claude (optional)

## Version History

### [1.0.0] - 2024-03-21

- Initial release
- MCP Tools management
- MCP Agent management
- Direct application to Cursor and Claude

## License

MIT License

## Contributing

1. Fork this repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## Author

- yeeed711
