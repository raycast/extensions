# Claude MCP

A Raycast extension for managing multiple MCP server configurations for Claude Desktop. Create, store, and switch between profiles with automatic restart functionality.

## Features

- **Profile Management**: Create, edit, and delete MCP server profiles
- **Quick Switching**: Switch between profiles with automatic Claude Desktop restart
- **Profile Validation**: Comprehensive validation of MCP server configurations
- **Search & Sort**: Find profiles quickly with search and sorting options
- **Profile Details**: View detailed information about each profile

## Installation

1. Install the extension from the Raycast Store
2. Configure your Claude Desktop configuration path in preferences (default: `~/Library/Application Support/Claude/claude_desktop_config.json`)

## Usage

### Commands

- **List MCP Profiles**: View all available profiles and manage them
- **Create MCP Profile**: Create a new MCP server profile
- **Switch MCP Profile**: Switch to a different profile

### Creating a Profile

1. Run "Create MCP Profile" command
2. Enter profile name and description
3. Add MCP servers with their configurations
4. Save the profile

### Switching Profiles

1. Run "Switch MCP Profile" command
2. Select desired profile
3. Claude Desktop will restart automatically with the new configuration

## Configuration

The extension requires access to your Claude Desktop configuration file. The default path is:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

You can customize this path in the extension preferences if needed.
