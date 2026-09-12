# Claude Code Config Switcher

A Raycast extension that provides lightning-fast switching between Claude Code configurations. **Directly syncs with CC Switch database** - no manual import needed!

## 🔄 Direct Sync with CC Switch

This extension **automatically syncs** with your CC Switch database (`~/.cc-switch/cc-switch.db`):

- ✅ **No Manual Import** - Profiles appear automatically
- ✅ **Real-time Sync** - Changes in CC Switch instantly visible in Raycast
- ✅ **Shared Active State** - Both tools see the same active profile
- ✅ **Bidirectional Updates** - Create/edit/delete in either tool
- ✅ **Zero Maintenance** - No sync conflicts or manual updates

**How it works:** Raycast reads/writes directly to CC Switch's SQLite database, making it a lightweight keyboard-driven client for CC Switch.

## Features

### Profile Management
- **Automatic Sync**: All CC Switch profiles automatically available
- **Quick Switching**: Instantly switch between profiles with keyboard shortcuts
- **Auto Backup**: Automatically backs up your current config before switching (configurable)
- **Create & Edit**: Full CRUD operations on profiles
- **Profile Duplication**: Duplicate existing profiles to create variations quickly

### MCP Server Management
- **Centralized Management**: Configure Model Context Protocol (MCP) servers from Raycast
- **Multiple Transport Types**: Support for STDIO, HTTP, and SSE transport types
- **Enable/Disable Servers**: Toggle servers on/off without deleting them
- **Environment Variables**: Configure environment variables for each server

### Configuration
- **Flexible Config Paths**: Support for `~/.claude/settings.json` and custom paths
- **Confirmation Prompts**: Optional confirmation before switching profiles
- **Auto Backup**: Configurable automatic backup before profile switches

## Prerequisites

**You must have CC Switch installed** to use this extension. The extension syncs directly with CC Switch's database.

- Download CC Switch: https://github.com/farion1231/cc-switch
- Ensure CC Switch database exists at: `~/.cc-switch/cc-switch.db`

## Installation

### From Raycast Store (Coming Soon)
1. Open Raycast
2. Search for "Claude Code Config Switcher"
3. Click Install

### Manual Installation (Development)
1. Clone this repository
2. Navigate to the extension directory
3. Run `npm install && npm run dev`
4. The extension will be loaded into Raycast

**Note:** If CC Switch is not installed, the extension will show a message prompting you to install it.

## Commands

### Manage Profiles
Open the main profile management interface where you can:
- **View all CC Switch profiles** (automatically synced)
- Create new profiles (saved to CC Switch database)
- Edit existing profiles
- Switch between profiles
- Delete profiles
- Duplicate profiles

**All changes are immediately synced with CC Switch!**

**Keyboard Shortcuts:**
- `⌘ E` - Edit profile
- `⌘ D` - Duplicate profile
- `⌘ ⌫` - Delete profile

### Quick Switch Profile
A streamlined command for quickly switching between profiles without the full management interface. Perfect for adding to your Quicklinks or Hotkeys.

### Manage MCP Servers
Configure your Model Context Protocol servers:
- Add new MCP servers
- Edit server configurations
- Enable/disable servers
- Delete servers
- Configure transport types (STDIO, HTTP, SSE)
- Set environment variables

**Keyboard Shortcuts:**
- `⌘ E` - Edit server
- `⌘ ⌫` - Delete server

## Configuration

### Extension Preferences

Access these in Raycast Preferences → Extensions → Claude Code Config Switcher:

**Config File Path**
- Default: `~/.claude/settings.json`
- Customize to point to a different Claude Code configuration file
- Supports `~` for home directory

**Auto Backup**
- Default: Enabled
- Automatically creates a timestamped backup before switching profiles
- Backups are saved as `settings.json.backup-[timestamp]`

**Confirm Switch**
- Default: Enabled
- Shows a confirmation dialog before switching profiles
- Disable for faster switching (not recommended for production configs)

## Profile Structure

Each profile stores:
- **Name**: A friendly name for the profile
- **Description**: Optional description
- **API Key**: Your Anthropic API key
- **Model**: Claude model selection (Sonnet 4.5, Opus 4.5, etc.)
- **Custom Instructions**: Optional system instructions
- **MCP Servers**: Full MCP server configuration

## How It Works

### Architecture

```
CC Switch Desktop App     →     SQLite Database     ←     Raycast Extension
   (Full UI)                  (~/.cc-switch/          (Quick Switching)
                               cc-switch.db)
```

**Single Source of Truth**: Both CC Switch and Raycast read/write the same database, ensuring perfect sync.

### Configuration Files

Claude Code uses a hierarchical settings system:
- **User-level**: `~/.claude/settings.json` (global settings)
- **Project-level**: `.claude/settings.json` (shared with team)
- **Local**: `.claude/settings.local.json` (personal, not in git)

This extension primarily manages the user-level configuration by default, but you can customize the path in preferences.

### Switching Profiles

When you switch to a profile:
1. (Optional) Current config is backed up with timestamp
2. Profile is marked as active in CC Switch database
3. Profile's configuration is written to your Claude Code settings file
4. Claude Code will use the new configuration on next startup
5. **CC Switch instantly reflects the change** (refresh to see)

### MCP Server Configuration

MCP servers are stored within your Claude Code configuration under the `mcpServers` key. Each server can be configured with:
- **Command**: The executable to run (e.g., `node`, `python`)
- **Arguments**: Command-line arguments
- **Environment Variables**: Custom environment variables
- **Transport Type**: STDIO, HTTP, or SSE
- **URL**: For HTTP/SSE transport types
- **Disabled**: Toggle server without removing it

**Note:** MCP server changes are written to Claude Code's config file, not CC Switch database (CC Switch has its own MCP management).

## Examples

### Using Your Existing CC Switch Profiles

1. **Open Raycast** (`⌘ + Space`)
2. Type **"Quick Switch Profile"**
3. See all your CC Switch profiles
4. Select one and press Enter
5. Done! Your config is switched

### Creating a New Profile

1. Open "Manage Profiles"
2. Select "Create New Profile"
3. Fill in the form:
   - **Name**: "Work - Production"
   - **Description**: "Production API key for work projects"
   - **API Key**: `sk-ant-...`
   - **Model**: Claude Sonnet 4.5
4. Submit to create
5. **The profile is now in CC Switch too!**

### Adding an MCP Server

1. Open "Manage MCP Servers"
2. Select "Add New MCP Server"
3. Configure:
   - **Name**: "filesystem"
   - **Transport**: STDIO
   - **Command**: `node`
   - **Arguments**: `/path/to/mcp-server-filesystem/build/index.js`
   - **Environment Variables**: (optional)
4. Submit to add

## Troubleshooting

### "CC Switch Not Found"
- **Install CC Switch** from https://github.com/farion1231/cc-switch
- Ensure the database exists at `~/.cc-switch/cc-switch.db`
- Run CC Switch at least once to create the database

### "Failed to read config"
- Ensure `~/.claude/settings.json` exists or specify a custom path
- Check file permissions
- Verify JSON syntax is valid

### "Failed to write config"
- Check write permissions for the config directory
- Ensure sufficient disk space
- Verify the directory `~/.claude` exists

### Profile Not Switching
- Restart Claude Code after switching profiles
- Verify the config file was actually updated
- Check backup files to ensure changes were written

### Profiles Not Syncing
- Ensure CC Switch database exists and is accessible
- Check SQLite is installed: `which sqlite3`
- Try refreshing the Raycast extension: `⌘ + R`

### MCP Servers Not Working
- Verify the command path is correct
- Check that required dependencies are installed
- Ensure environment variables are set correctly
- Restart Claude Code after adding servers

## Development

Built with:
- [Raycast API](https://developers.raycast.com/)
- TypeScript
- React

### Project Structure
```
src/
├── components/          # React components
│   ├── CreateProfileForm.tsx
│   ├── EditProfileForm.tsx
│   ├── AddMcpServerForm.tsx
│   └── EditMcpServerForm.tsx
├── utils/              # Utility functions
│   ├── config.ts       # Config file I/O
│   ├── storage.ts      # Profile storage
│   └── profile-switcher.ts
├── types.ts            # TypeScript types
├── index.tsx           # Main profile management command
├── switch-profile.tsx  # Quick switch command
└── manage-mcp.tsx      # MCP server management
```

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

## Credits

Built to complement [CC Switch](https://github.com/farion1231/cc-switch) - a comprehensive desktop application for managing AI CLI tool configurations. This Raycast extension provides a keyboard-driven, lightning-fast interface to your CC Switch profiles.

### CC Switch vs Raycast Extension

**Use CC Switch for:**
- Initial setup and profile creation
- Detailed configuration management
- Speed testing API endpoints
- Managing GitHub skills
- Visual profile management

**Use Raycast Extension for:**
- Quick profile switching (⌘ + Space)
- Keyboard-driven workflow
- Minimal context switching
- Fast access without opening apps

**Together:** The perfect combination for Claude Code power users!

## License

MIT

## Support

For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/yourusername/claude-code-config-switcher).
