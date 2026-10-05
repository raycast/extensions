# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for working with Claude Code from Raycast. It lets users save project directories and launch Claude Code in them with a single keystroke, and manage running Claude Code sessions and background agents (list, attach, stop, delete, dispatch).

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
The extension provides two Raycast commands:

**Open Project (`open-claude-code`)**
1. Manages a list of project directories stored in Raycast's LocalStorage
2. Launches Claude Code in the selected directory via the terminal
3. Tracks usage statistics (last opened, open count) for smart sorting

**Claude Sessions (`claude-sessions`)**
1. Lists all Claude Code sessions and background agents (`claude agents --all --json`) with live status, polling every few seconds
2. Attaches/resumes background agents in the terminal (`claude attach <id>`), forks interactive sessions (`claude --resume <uuid> --fork-session`)
3. Stops sessions (`claude stop <id>` for background agents, SIGTERM for interactive ones) and deletes completed background sessions (`claude rm <id>`)
4. Dispatches new background agents (`claude --bg "prompt"`) and opens new interactive sessions

### Key Components

**Open Project View (`src/open-claude-code.tsx`)**
- `Command`: Main component that renders the projects list
- `AddProjectForm` / `EditProjectForm`: Forms for adding and editing projects
- Directory validation and error handling

**Claude Sessions View (`src/claude-sessions.tsx`)**
- Polling session list grouped into Running/Completed sections
- Per-kind actions (attach, stop, delete, fork, jump-to-terminal) and forms for new sessions/background agents

**Claude CLI Wrapper (`src/claude-cli.ts`)**
- Resolves the `claude` binary (preference, common install locations, login-shell `which`) since Raycast does not inherit the shell PATH
- `execFile` wrappers for `agents --all --json`, `stop`, `rm`, and `--bg`
- Zod schemas (discriminated union on `kind`) validate the CLI's JSON output; duplicate sessionIds are merged

**Terminal Adapters (`src/terminal-adapters/`)**
- Abstraction layer for different terminal applications
- `TerminalAdapter` interface defines the contract for terminal integrations
- Implementations for Terminal.app, Alacritty, Ghostty, Warp, and iTerm2
- Registry pattern for adapter management in `registry.ts`
- `claude-command.ts` builds the `claude` invocation (with optional args like `attach <id>`) embedded into each adapter's shell command

**Shared Modules**
- `src/launch-terminal.ts`: opens the preferred terminal in a directory running `claude` (optionally with args)
- `src/focus-terminal/`: focuses the terminal window already hosting an interactive session; `index.ts` resolves pid → tty → hosting app and dispatches to per-terminal adapters in `adapters/` (AppleScript tab targeting for Terminal.app/iTerm2, tty title-marker matching via Ghostty's AppleScript API for Ghostty 1.3+), falling back to NSRunningApplication pid activation (`activate-app.ts`)
- `src/projects.ts`: `Project` type, LocalStorage key, read-only loader
- `src/utils.ts`: `expandTilde`, `collapseTilde`, `getDirectoryName`

**Icon System (`src/project-icons.ts`)**
- Maps icon names to Raycast Icon components
- Supports customizable default icon via preferences

### Data Model

Projects are stored in LocalStorage with this structure:
```typescript
interface Project {
  id: string;          // UUID
  path: string;        // Absolute directory path
  name?: string;       // Optional display name
  icon?: string;       // Icon identifier
  addedAt: Date;       // Creation timestamp
  lastOpened?: Date;   // Last usage timestamp
  openCount: number;   // Usage counter
}
```

Sessions are not persisted by the extension; they are read live from the Claude CLI (never from `~/.claude/sessions/*` or `~/.claude/jobs/*`, which are undocumented and unstable).

### User Preferences
Configurable via Raycast preferences:
- `terminalApp`: Terminal choice (Terminal, Alacritty, Ghostty, Warp, iTerm2)
- `ghosttyOpenBehavior`: Window vs. tab behavior when Ghostty is selected
- `defaultProjectIcon`: Default icon for new projects
- `claudeBinaryPath` (Claude Sessions command only): Path to the Claude executable when auto-detection fails

### Error Handling
- Validates directories exist before attempting to open
- Surfaces actionable errors when the Claude binary cannot be found (with recovery via command preferences)
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