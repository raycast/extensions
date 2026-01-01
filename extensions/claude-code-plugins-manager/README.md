# Claude Plugin Manager

A Raycast Extension for browsing, installing, and managing Claude Code plugins.

## Features

### 🔍 Browse Claude Plugins
- Search and browse all available plugins across all marketplaces
- Filter by marketplace
- View plugin details including components (commands, skills, agents, hooks, MCP servers)
- Quick installation with scope selection (user/project/local)

### 🏪 Manage Marketplaces
- View all configured plugin marketplaces
- Add new marketplaces (GitHub repos, local directories, Git URLs, remote URLs)
- Update marketplace data
- Remove marketplaces

### 🔧 Developer Tools
- Validate plugin manifests
- Quick access to plugin source code
- Copy plugin IDs and install commands

## Requirements

- [Claude Code CLI](https://code.claude.com) must be installed
- macOS (for Raycast compatibility)
- Node.js 20+ (for development)

## Installation

### From Raycast Store (Coming Soon)

1. Open Raycast
2. Search for "Claude Plugin Manager"
3. Click Install

### Manual Installation (Development)

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd claude-code-plugins
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

## Usage

### Browse and Install Plugins

1. Open Raycast (⌘ + Space)
2. Type "Browse Claude Plugins"
3. Search for plugins
4. Select a plugin to view details
5. Choose installation scope (user/project/local)
6. Install the plugin

### Manage Marketplaces

1. Open Raycast
2. Type "Manage Plugin Marketplaces"
3. Add, update, or remove marketplace sources

Supported marketplace types:
- **GitHub Repository**: `owner/repo`
- **Local Directory**: `/path/to/marketplace`
- **Git URL**: `https://github.com/owner/repo.git`
- **Remote URL**: `https://example.com/marketplace.json`

### Validate Plugin (Dev Tool)

1. Open Raycast
2. Type "Validate Plugin"
3. Select a plugin directory
4. View validation results

## Commands

This extension provides 3 commands:

1. **Browse Claude Plugins** - Main plugin browsing interface
2. **Manage Plugin Marketplaces** - Configure marketplace sources
3. **Validate Plugin** - Developer tool for plugin validation

## Architecture

### Data Layer
- Direct JSON file parsing from `~/.claude/plugins/` for fast reads
- CLI commands for all write operations (install, uninstall, etc.)
- 5-minute cache using Raycast Cache API

### Tech Stack
- TypeScript
- React
- Raycast API
- Node.js (for CLI execution)

### Project Structure

```
src/
├── index.tsx                  # Browse Plugins command
├── marketplaces.tsx           # Manage Marketplaces command
├── plugin-details.tsx         # Plugin detail view
├── add-marketplace.tsx        # Add marketplace form
├── validate-plugin.tsx        # Validate plugin command
├── lib/
│   ├── types.ts              # TypeScript type definitions
│   ├── claude-cli.ts         # CLI wrapper functions
│   └── cache-manager.ts      # Caching layer
├── hooks/
│   ├── usePlugins.ts         # Plugin data hook
│   └── useMarketplaces.ts    # Marketplace data hook
└── components/
    └── ErrorView.tsx         # Error display component
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Start development mode (hot reload)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix lint issues
npm run fix-lint
```

### Testing

The extension will appear in Raycast during development mode. Test all commands:

- [ ] Browse and search plugins
- [ ] Install plugin with different scopes
- [ ] Add marketplace (GitHub, directory, Git, URL)
- [ ] Update/remove marketplace
- [ ] View plugin details
- [ ] Validate plugin

## Troubleshooting

### Claude CLI Not Found

If you get "Claude CLI is not installed" error:

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Verify installation
which claude
claude --version
```

### No Plugins Found

If no plugins are showing:

```bash
# Update marketplaces
claude plugin marketplace update

# Check marketplace configuration
cat ~/.claude/plugins/known_marketplaces.json
```

### Cache Issues

If data seems stale, the extension uses a 5-minute cache. You can:
- Wait 5 minutes for automatic refresh
- Restart Raycast to clear the cache
- Use the refetch actions in the UI

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Credits

Created for the Claude Code ecosystem.

## Links

- [Claude Code Documentation](https://code.claude.com/docs)
- [Raycast Developer Docs](https://developers.raycast.com)
- [Claude Code Plugins Guide](https://code.claude.com/docs/en/discover-plugins)
