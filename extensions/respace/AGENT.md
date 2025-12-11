# Agent Documentation for Respace Raycast Extension

## Overview

Respace is a Raycast extension that allows users to create and manage workspace bundles containing apps, files, folders, URLs, and terminal commands. With a single command, users can launch entire workspaces at once, making it easy to switch between different work contexts.

This project follows a **colocation principle** where command-specific code lives with its command, and only truly shared code is extracted to common locations.

## Architecture

### Project Structure

```
respace-raycast/
├── src/
│   ├── commands/                    # UI Commands (Raycast entry points)
│   │   ├── manage-workspaces/       # Workspace CRUD command
│   │   │   ├── components/          # Command-specific React components
│   │   │   ├── constants/           # Command-specific constants
│   │   │   ├── utils/               # Command-specific utilities
│   │   │   └── index.tsx            # Main command component
│   │   ├── open-workspace/          # Launch workspaces command
│   │   └── quick-open/              # CLI-style quick launcher
│   │
│   ├── core/                        # Core business logic services
│   │   ├── storage/                 # Workspace persistence (CRUD operations)
│   │   ├── launcher/                # Item launching with strategies
│   │   └── deeplink/                # Raycast deeplink utilities
│   │
│   ├── lib/                         # Truly shared utilities
│   │   └── helpers/                 # Add utils here only if used 3+ times
│   │
│   ├── types/
│   │   └── workspace.ts             # TypeScript interfaces for Workspace and WorkspaceItem
│   │
│   └── [command-name].tsx           # Entry point exports for Raycast
│
├── assets/
│   └── command-icon.png             # Extension icon
├── package.json                     # Raycast extension manifest & dependencies
├── tsconfig.json                    # TypeScript configuration
├── biome.json                       # Biome formatter configuration
└── AGENT.md                         # This file
```

### When to Put Code Where?

#### Commands Directory (`commands/`)

**Put code here if:** It's specific to one command's UI/UX

Each command can have:

- `components/` - React components used only by this command
- `utils/` - Helper functions used only by this command
- `constants/` - Constants used only by this command
- `hooks/` - React hooks used only by this command (if needed)

**Example:**

```
commands/manage-workspaces/
├── components/
│   ├── add-item-form.tsx        # Form for adding items
│   ├── edit-item-form.tsx       # Form for editing items
│   └── manage-items-view.tsx    # Items list view
├── constants/
│   └── workspace-icons.ts       # Icon definitions
├── utils/
│   └── workspace-helpers.ts     # UI helper functions
└── index.tsx                    # Main command component
```

#### Core Directory (`core/`)

**Put code here if:** It's business logic used by multiple commands

- `storage/` - Data persistence (CRUD operations)
- `launcher/` - Launch orchestration and strategies
- `deeplink/` - URL generation for Raycast

**Strategy Pattern Example:**

```typescript
// core/launcher/strategies/app-launcher.ts
export class AppLauncher implements ItemLaunchStrategy {
  async launch(item: WorkspaceItem): Promise<void> {
    await execAsync(`open -a "${item.path}"`);
  }
}
```

#### Lib Directory (`lib/`)

**Put code here ONLY if:** Used by 3+ different commands AND truly generic

Currently empty - this is intentional! Don't prematurely extract.

**Anti-pattern:** Moving utils here "just in case"
**Good pattern:** Copy code twice, extract on third use

#### Types Directory (`types/`)

**Put code here if:** TypeScript type definitions used across the project

```typescript
// types/workspace.ts
export type WorkspaceItemType = "app" | "folder" | "file" | "url" | "terminal";
export interface WorkspaceItem {
  /* ... */
}
export interface Workspace {
  /* ... */
}
```

### Core Components

#### 1. Data Types (`src/types/workspace.ts`)

- **WorkspaceItem**: Represents a single item in a workspace
  - `type`: "app" | "folder" | "file" | "url" | "terminal"
  - `name`: Display name
  - `path`: Application name, file path, URL, or terminal command
  - `delay`: Optional launch delay in milliseconds

- **Workspace**: Collection of workspace items
  - `id`: Unique identifier
  - `name`: Workspace name
  - `description`: Optional description
  - `items`: Array of WorkspaceItem
  - `createdAt`, `updatedAt`: Timestamps

- **WorkspacesData**: Root storage object
  - `workspaces`: Array of Workspace objects

#### 2. Storage Layer (`src/utils/storage.ts`)

Manages persistent storage in `~/.config/respace-raycast/workspaces.json`:

- `readWorkspaces()`: Reads all workspaces from JSON file
- `writeWorkspaces()`: Writes workspaces to JSON file
- `getAllWorkspaces()`: Returns all workspaces
- `getWorkspaceById()`: Retrieves a specific workspace
- `createWorkspace()`: Creates a new workspace with generated ID and timestamps
- `updateWorkspace()`: Updates existing workspace
- `deleteWorkspace()`: Removes a workspace

#### 3. Launcher (`src/utils/launcher.ts`)

Handles launching different types of workspace items:

- **App**: Uses `open -a` command to launch macOS applications
- **Folder/File**: Uses Raycast's `open()` API to open in Finder
- **URL**: Opens URL in default browser
- **Terminal**: Executes command in new Terminal window using AppleScript

Key features:

- Sequential launching with optional delays
- Error handling with user-friendly HUD messages
- Progress toasts showing launch status
- Detailed error reporting

#### 4. Open Workspace Command (`src/open-workspace.tsx`)

List view showing all available workspaces with:

- Search functionality
- Workspace details (name, description, item count)
- Action to launch workspace
- Quick actions (show in Finder, copy to clipboard)

#### 5. Manage Workspaces Command (`src/manage-workspaces.tsx`)

Full CRUD interface with nested forms:

- **List View**: All workspaces with edit/delete actions
- **Create Workspace Form**: Add new workspace with items
- **Edit Workspace Form**: Modify existing workspace
- **Add Item Form**: Add individual items to workspace with type-specific fields

## Adding New Features

### Adding a New Command

1. Create `commands/new-command/index.tsx`
2. Add command-specific components in `commands/new-command/components/`
3. Create entry point: `src/new-command.tsx` with `export { default } from "./commands/new-command"`
4. Update `package.json` commands array

### Adding a New Workspace Item Type

1. Add type to `types/workspace.ts`: `WorkspaceItemType`
2. Create strategy: `core/launcher/strategies/my-type-launcher.ts`
3. Register in `core/launcher/launcher.ts` strategies map
4. Add UI support in `commands/manage-workspaces/components/item-form.tsx`

### Adding Shared Utility

**Ask first:** Is this used 3+ times?

- **No?** Keep it local to the command
- **Yes?** Add to `lib/helpers/my-util.ts`

## Usage

### Creating a Workspace

1. Open "Manage Workspaces" command
2. Press Cmd+N or select "Create New Workspace"
3. Enter workspace name and description
4. Add items:
   - Choose item type (app, folder, file, url, terminal)
   - Enter name and path/command
   - Set optional launch delay
5. Submit to create workspace

### Launching a Workspace

1. Open "Open Workspace" command
2. Search for desired workspace
3. Press Enter or click "Open Workspace"
4. All items launch sequentially with configured delays

### Editing a Workspace

1. Open "Manage Workspaces" command
2. Select workspace and choose "Edit Workspace"
3. Modify name, description, or items
4. Add/remove items as needed
5. Submit to save changes

### Deleting a Workspace

1. Open "Manage Workspaces" command
2. Select workspace and press Cmd+D or choose "Delete Workspace"
3. Confirm deletion

## Technical Details

### Dependencies

- **@raycast/api**: Core Raycast API for UI components and system integration
- **@raycast/utils**: Utility functions for common Raycast patterns
- **TypeScript**: Type-safe development
- **Biome**: Code formatting and linting

### Build & Development

```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm dev

# Build for production
pnpm build

# Format code
pnpm format

# Lint and fix
pnpm check
```

### Window Tracking (Brief)

- Hybrid tracking picks window-level for AppleScript-aware apps and app-level when window IDs cannot be read (common for Electron/Chromium apps).
- Launch workflow: detect running state and window IDs before launch, launch, wait ~1.5s, capture after-launch IDs, and track new windows accordingly.
- Closing: window-level items close specific windows; app-level items quit the whole app. Already running apps are intentionally not tracked.
- Compatibility: native macOS apps (Finder, Calendar, Safari, Terminal, TextEdit, etc.) support window-level; most Electron/Chromium apps (VS Code, Slack, Discord, Spotify, Chrome-family) fall back to app-level.
- Limitations: depends on Accessibility permissions; window IDs can change; app-level tracking closes all windows of that app.

### Storage Format

Workspaces are stored in `~/.config/respace-raycast/workspaces.json`:

```json
{
  "workspaces": [
    {
      "id": "workspace-1234567890-abc123",
      "name": "Web Development",
      "description": "My web dev environment",
      "items": [
        {
          "id": "item-1234567890-0",
          "type": "app",
          "name": "VS Code",
          "path": "Visual Studio Code"
        },
        {
          "id": "item-1234567890-1",
          "type": "url",
          "name": "GitHub",
          "path": "https://github.com",
          "delay": 1000
        },
        {
          "id": "item-1234567890-2",
          "type": "terminal",
          "name": "Start Server",
          "path": "cd ~/project && npm start",
          "delay": 2000
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Error Handling

The extension includes comprehensive error handling:

- **Storage errors**: Gracefully handles missing/corrupt JSON files
- **Launch errors**: Shows specific error messages for failed launches
- **Path validation**: Checks file/folder existence before opening
- **User feedback**: Toast notifications and HUD messages for all operations

## Design Principles

### 1. Colocation Over Premature Abstraction

```
✅ GOOD: Keep code close to where it's used
commands/manage-workspaces/utils/workspace-helpers.ts

❌ BAD: Extract too early
lib/helpers/workspace-helpers.ts (if only used by one command)
```

### 2. Repeat Code Until Pattern Emerges

```
✅ GOOD: Copy helper function twice
❌ BAD: Create abstraction on first use
```

### 3. Strategy Pattern for Extensibility

```
✅ GOOD: New item type = new strategy file
❌ BAD: Giant switch statement
```

### 4. Clear Boundaries

- **Commands** = UI Layer (React components, forms, lists)
- **Core** = Business Logic (services, strategies)
- **Lib** = Truly Generic (date formatting, validation)
- **Types** = Type Definitions (interfaces, types)

## File Naming Conventions

- Commands: `kebab-case` (matches Raycast convention)
- Components: `kebab-case.tsx`
- Utils: `kebab-case.ts`
- Types: `kebab-case.ts`
- Classes: `PascalCase` in file content

## Import Path Examples

```typescript
// From a command component to core service
import { getAllWorkspaces } from "../../../core/storage/storage";

// From a command to types
import type { Workspace } from "../../../types/workspace";

// Within same command
import { getItemIcon } from "../utils/workspace-helpers";

// Entry point
// src/manage-workspaces.tsx
export { default } from "./commands/manage-workspaces";
```

## Benefits of This Structure

✅ **Easy Navigation** - Everything for a feature is in one place  
✅ **Scalable** - Add commands without touching existing code  
✅ **Maintainable** - Small, focused files (~150 lines average)  
✅ **No Over-Engineering** - Shared code only when actually shared  
✅ **Clear Ownership** - Obvious where new code should go

## Anti-Patterns to Avoid

❌ Moving utils to `lib/` when only used once  
❌ Creating deep abstraction layers "for the future"  
❌ Putting business logic in command components  
❌ Creating barrel exports (`index.ts`) everywhere  
❌ Mixing UI and business logic in same file

## Future Enhancements

Potential improvements for future versions:

1. Import/export workspaces
2. Workspace templates
3. Keyboard shortcuts for favorite workspaces
4. Launch order customization (parallel vs sequential)
5. Workspace groups/categories
6. Statistics and usage tracking
7. Share workspaces with team
8. Conditional launches (e.g., only if app not already running)
9. Environment-specific workspaces (work, personal, etc.)
10. Integration with other Raycast extensions

## Contributing

When contributing to this extension:

1. Follow TypeScript best practices
2. Use Biome for code formatting (`pnpm format`)
3. Test all workspace item types (app, folder, file, url, terminal)
4. Ensure error handling covers edge cases
5. Update this documentation for significant changes
6. Maintain backward compatibility with storage format

## Support

For issues or questions:

- Check Raycast extension documentation: https://developers.raycast.com/
- Review Raycast API reference: https://developers.raycast.com/api-reference
- File issues in the GitHub repository
