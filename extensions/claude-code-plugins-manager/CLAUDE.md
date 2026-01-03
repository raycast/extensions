# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast Extension that provides a plugin manager for Claude Code. It allows users to browse, install, and manage Claude Code plugins directly from Raycast's command interface.

## Development Commands

```bash
# Install dependencies
npm install

# Start development mode (hot reload in Raycast)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix lint issues automatically
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

### Testing During Development
When running `npm run dev`, the extension loads into Raycast with hot reload. Test by:
1. Opening Raycast (⌘ + Space)
2. Typing the command name (e.g., "Browse Claude Plugins")
3. All changes auto-reload without restarting Raycast

## Architecture

### Hybrid Data Access Pattern

**Critical Design Decision**: This extension uses different strategies for reads vs writes:

**READ operations**: Direct JSON file parsing from `~/.claude/plugins/`
- `installed_plugins.json` - Currently installed plugins
- `known_marketplaces.json` - Configured marketplaces
- `<marketplace>/.claude-plugin/marketplace.json` - **Single source of truth for available plugins**
- Individual plugin manifests at `<marketplace>/(plugins|external_plugins)/<name>/.claude-plugin/plugin.json` for detailed metadata

**WRITE operations**: Always use CLI commands via `claude-cli.ts`
- Install, uninstall, enable, disable plugins
- Add, remove, update marketplaces
- This ensures proper validation and file locking

**Why?** Direct JSON parsing is 10x faster than spawning CLI processes for reads, but CLI commands ensure data integrity for writes.

**Claude CLI Detection**: The extension searches multiple common installation paths (pipx, Homebrew Intel/Apple Silicon, npm global) and caches the result.

### Plugin Discovery

**Important**: The extension reads `marketplace.json` as the authoritative source for all available plugins. This file defines:
- All plugins in the marketplace (including LSP servers, MCP integrations, external plugins)
- Plugin metadata (name, description, author, version, category)
- Plugin source location (local path or external URL)

**No directory scanning** - if a plugin isn't in `marketplace.json`, it won't be shown.

### Caching Layer

Uses Raycast Cache API with 5-minute TTL (see `cache-manager.ts`):
- `all-plugins` - All available plugins across marketplaces
- `marketplaces` - List of configured marketplaces
- `installed-plugins` - Currently installed plugins

Cache invalidation happens automatically on write operations.

### React Hooks Pattern

All data fetching uses custom hooks in `hooks/` that:
1. Manage loading/error states
2. Use the cache layer automatically
3. Provide `refetch()` to force cache invalidation
4. Return consistent `{ data, isLoading, error, refetch }` interface

### Plugin ID Format

Plugin IDs follow the format: `plugin-name@marketplace-name`

Example: `plugin-dev@claude-code-plugins`

This format is used throughout for installation commands and plugin identification.

### Installation Scope Limitation

**Critical Design Decision**: This extension **only supports `user` scope** for plugin installations.

**Why?** Claude CLI supports three scopes (user, project, local), but Raycast runs as a global macOS application without a working directory context:
- ❌ No concept of "current directory"
- ❌ No knowledge of which project the user wants to install for
- ❌ Cannot determine Git repository boundaries

Therefore, only global `user` scope makes sense for a Raycast extension. Users who need project-specific or local plugins should use the Claude CLI directly:

```bash
cd /path/to/your/project
claude plugin install plugin-name@marketplace --scope project
```

## Key Files

- `src/lib/types.ts` - All TypeScript type definitions
- `src/lib/claude-cli.ts` - CLI command wrappers (handles writes + Claude path detection)
- `src/lib/cache-manager.ts` - Caching with TTL
- `src/hooks/usePlugins.ts` - Fetches all available plugins
- `src/hooks/useMarketplaces.ts` - Fetches marketplace list
- `src/components/ErrorView.tsx` - Standardized error display

## Adding New Features

### Adding a New Command View
1. Create new `.tsx` file in `src/`
2. Add command entry to `package.json` commands array
3. Use Raycast components: `List`, `Detail`, `Form`, `Action`, etc.
4. Follow existing hook patterns for data fetching

### Modifying Data Access
- **READ**: Update parser in relevant hook or `claude-cli.ts`
- **WRITE**: Add/modify function in `claude-cli.ts` using CLI commands
- Always invalidate relevant cache keys after writes

### Error Handling
Use custom error types from `types.ts` (ClaudeNotInstalledError, PluginNotFoundError, MarketplaceError). Display errors using `ErrorView` component for consistency.
