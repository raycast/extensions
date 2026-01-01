# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast Extension that provides a plugin manager for Claude Code. It allows users to browse, install, and manage Claude Code plugins directly from Raycast's command interface.

## Development Commands

### Setup and Development
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

### Data Access Pattern

**Critical Design Decision**: This extension uses a hybrid data access pattern:

1. **READ operations**: Direct JSON file parsing from `~/.claude/plugins/` for performance
   - `installed_plugins.json` - All installed plugins and their metadata
   - `known_marketplaces.json` - Configured plugin marketplaces
   - **`<marketplace>/.claude-plugin/marketplace.json` - Single source of truth for available plugins** ⭐
   - Optional: Individual plugin manifests at `<marketplace>/(plugins|external_plugins)/<name>/.claude-plugin/plugin.json` for detailed metadata (components, hooks)

2. **WRITE operations**: Always use CLI commands (via `claude-cli.ts`) for safety
   - Install, uninstall, enable, disable plugins
   - Add, remove, update marketplaces
   - This ensures proper validation and file locking

**Why this pattern?** Direct JSON parsing is 10x faster than spawning CLI processes for reads, but CLI commands ensure data integrity for writes.

**Plugin Discovery**: The extension reads `marketplace.json` as the authoritative source for all available plugins. This file defines:
- All plugins in the marketplace (including LSP servers, MCP integrations, external plugins)
- Plugin metadata (name, description, author, version, category)
- Plugin source location (local path or external URL)
- No directory scanning - if a plugin isn't in `marketplace.json`, it won't be shown

### Caching Layer

Uses Raycast Cache API with 5-minute TTL (`cache-manager.ts`):
- `all-plugins` - All available plugins across marketplaces
- `marketplaces` - List of configured marketplaces
- `installed-plugins` - Currently installed plugins

Cache invalidation happens automatically on write operations (install, uninstall, etc.).

### Component Structure

```
src/
├── index.tsx                  # Browse Plugins - main search/browse interface
├── marketplaces.tsx           # Manage Marketplaces - add/remove sources
├── plugin-details.tsx         # Detail view with install actions
├── add-marketplace.tsx        # Form for adding marketplace sources
├── validate-plugin.tsx        # Dev tool for plugin.json validation
├── lib/
│   ├── types.ts              # All TypeScript interfaces
│   ├── claude-cli.ts         # CLI command wrappers
│   └── cache-manager.ts      # Caching with TTL
├── hooks/
│   ├── usePlugins.ts         # Fetches all available plugins
│   └── useMarketplaces.ts    # Fetches marketplace list
└── components/
    └── ErrorView.tsx         # Standardized error display
```

### React Hooks Pattern

All data fetching uses custom hooks that:
1. Manage loading/error states
2. Use the cache layer automatically
3. Provide `refetch()` to force cache invalidation
4. Return consistent `{ data, isLoading, error, refetch }` interface

Example usage:
```tsx
const { plugins, isLoading, error, refetch } = usePlugins();
```

### Plugin ID Format

Plugin IDs follow the format: `plugin-name@marketplace-name`

Example: `plugin-dev@claude-code-plugins`

This format is used throughout for:
- Installation commands
- InstalledPluginsData keys
- Plugin identification across marketplaces

## File Locations

### User Data (macOS)
- `~/.claude/plugins/installed_plugins.json` - Installed plugin registry
- `~/.claude/plugins/known_marketplaces.json` - Marketplace configuration
- `~/.claude/plugins/marketplaces/<name>/` - Cached marketplace data

### Plugin Manifest Structure
Each plugin must have a `.claude-plugin/plugin.json` manifest with:
```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": { "name": "Author Name" }
}
```

## TypeScript Types

All types are defined in `src/lib/types.ts`:

- `Plugin` - Plugin data from marketplace (includes install status)
- `InstalledPlugin` - Installed plugin metadata
- `Marketplace` - Marketplace configuration
- `PluginManifest` - Schema for plugin.json files
- `InstalledPluginsData` - Format of installed_plugins.json
- `MarketplacesData` - Format of known_marketplaces.json

When working with plugin data, always check if `installStatus` exists to determine if a plugin is installed.

## Raycast Extension Requirements

### Extension Manifest (package.json)
- Must include `$schema: "https://www.raycast.com/schemas/extension.json"`
- Commands define the Raycast UI entry points (not CLI commands)
- Each command needs: `name`, `title`, `description`, `mode` (view/no-view)

### TypeScript Configuration
- Target: ES2020
- Module: CommonJS (required by Raycast)
- JSX: React
- Strict mode: false (Raycast convention)
- Must include `raycast-env.d.ts` for type definitions

### Icons
- Main extension icon: `icon.png` (512x512px minimum)
- Custom icons stored in `assets/` directory
- Reference from README: `assets/ICON_README.md`

## Common Development Tasks

### Adding a New Command View
1. Create new `.tsx` file in `src/`
2. Add command entry to `package.json` commands array
3. Use Raycast components: `List`, `Detail`, `Form`, `Action`, etc.
4. Follow existing hook patterns for data fetching

### Modifying Data Access
- READ: Update parser in relevant hook or `claude-cli.ts`
- WRITE: Add/modify function in `claude-cli.ts` using CLI commands
- Always invalidate relevant cache keys after writes

### Error Handling
- Use custom error types from `types.ts` (ClaudeNotInstalledError, PluginNotFoundError, etc.)
- Display errors using `ErrorView` component for consistency
- Hooks automatically catch and expose errors via error state
