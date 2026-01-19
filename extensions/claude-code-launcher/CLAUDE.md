# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for quickly opening Claude Code sessions in selected directories. It allows users to save favorite project directories and launch Claude Code with a single keystroke through Raycast.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (hot reload enabled)
npm run dev

# Build the extension
npm run build

# Run linter
npm run lint

# Fix linting issues automatically
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

## Code Quality Checks

**IMPORTANT: Always run these checks before considering work complete:**

```bash
# Run TypeScript type checking
npx tsc --noEmit

# Run linter to check code style
npm run lint

# If there are linting issues, fix them
npm run fix-lint
```

Both TypeScript compilation and linting must pass without errors before code changes are considered complete.

## Architecture

### Core Functionality
The extension provides a single Raycast command that:
1. Manages a list of favorite directories stored in Raycast's LocalStorage
2. Launches Claude Code in the selected directory via the terminal
3. Tracks usage statistics (last opened, open count) for smart sorting

### Key Components

**Main View (`src/open-claude-code.tsx`)**
- `Command`: Main component that renders the favorites list
- `AddFavoriteForm`: Form for adding new directories to favorites
- `EditFavoriteForm`: Form for editing existing favorites
- Directory validation, path expansion, and error handling

**Terminal Adapters (`src/terminal-adapters/`)**
- Abstraction layer for different terminal applications
- `TerminalAdapter` interface defines the contract for terminal integrations
- Implementations for Terminal.app and Alacritty
- Registry pattern for adapter management in `registry.ts`

**Icon System (`src/favorite-icons.ts`)**
- Provides Raycast icons for favorites with Claude brand tinting
- Maps icon names to Raycast Icon components
- Supports customizable default icon via preferences

### Data Model

Favorites are stored in LocalStorage with this structure:
```typescript
interface Favorite {
  id: string;          // UUID
  path: string;        // Absolute directory path
  name?: string;       // Optional display name
  icon?: string;       // Icon identifier
  addedAt: Date;       // Creation timestamp
  lastOpened?: Date;   // Last usage timestamp
  openCount: number;   // Usage counter
}
```

### User Preferences
Configurable via Raycast preferences:
- `claudeBinaryPath`: Path to Claude executable (default: `~/.claude/local/claude`)
- `terminalApp`: Terminal choice (Terminal or Alacritty)
- `defaultFavoriteIcon`: Default icon for new favorites

### Error Handling
- Validates Claude binary exists and is executable
- Validates directories exist before attempting to open
- Provides actionable error messages with recovery options
- Handles corrupted LocalStorage data gracefully

## Testing Approach

Since this is a Raycast extension, testing focuses on:
1. Manual testing using `npm run dev` in Raycast
2. Verifying all user interactions work correctly
3. Testing error scenarios (missing directories, invalid paths)
4. Ensuring terminal adapters work with different configurations

## Resources

- **Raycast Developer Documentation**: https://developers.raycast.com
- **LLM-friendly docs**: https://developers.raycast.com/llms.txt
- **Raycast API Reference**: https://developers.raycast.com/api-reference
- **Extension Examples**: https://github.com/raycast/extensions