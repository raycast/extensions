# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** for package management.

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build the Raycast extension
- `pnpm run lint` - Run ESLint to check code quality
- `pnpm run fix-lint` - Fix linting issues automatically
- `pnpm run publish` - Publish to Raycast Store

## Project Architecture

This is a Raycast extension that monitors and manages AI CLI tool versions. The main components are:

### Core Structure
- `src/vibe-version.tsx` - Main command component that displays AI tool versions and update status
- `src/vibe-settings.tsx` - Settings component for configuring default agents and package managers
- `src/vibe-coding.tsx` - Quick launch component for AI assistants
- Triple-command extension: version management, settings configuration, and quick launch

### Key Features
- **Multi-Tool Support**: Currently supports Claude Code, Gemini CLI, Qwen Code CLI, and YOLO agent
- **Version Tracking**: Compares installed versions with latest npm versions
- **Update Management**: Provides different update mechanisms (CLI updates vs npm global installs)
- **Settings Management**: Configure default AI agent, package manager, and terminal preferences
- **Quick Launch**: One-click launch of AI assistants in preferred terminal
- **Real-time Status**: Shows up-to-date, outdated, or unknown status for each tool

### Technical Implementation
- Uses `@raycast/api` for UI components and actions
- Executes shell commands via `runInLoginShell` function to check versions and perform updates
- Implements robust error handling with toast notifications and `showFailureToast`
- Uses React hooks for state management and async operations
- Supports multiple version flag detection (`-v`, `--version`, `version`)
- Settings persistence using Raycast's LocalStorage API
- AppleScript integration for terminal launching (Terminal, iTerm, custom terminals)

### Tool Configuration System
The `TOOLS` array defines supported AI tools with:
- `id`: Unique identifier
- `title`: Display name
- `npmPackage`: NPM package name for version checking
- `command`: CLI command to execute
- `updateType`: Either "cli" (native update command) or "npmGlobal" (npm global install)
- `updateCommand`: Specific update command for CLI-based tools

### Settings Management
Settings are stored in LocalStorage and include:
- `defaultVibeAgent`: Selected default AI agent (claude, gemini, qwen, yolo)
- `packageManager`: Preferred package manager (npm, pnpm, yarn)
- `yoloEnabled`: Boolean flag to show/hide YOLO agent in settings
- `defaultTerminal`: Preferred terminal application (terminal, iterm, custom)
- `customTerminal`: Custom terminal application name

### Shell Execution and Security
All commands run in login shell (`zsh`) to ensure proper environment and PATH access. 

**Security Considerations:**
- All shell arguments are escaped using `escapeShellArg()` function to prevent command injection
- AppleScript strings are escaped using `escapeAppleScriptString()` 
- Custom terminal names are validated to only allow alphanumeric characters, spaces, hyphens, and underscores
- The extension handles both stdout and stderr parsing for comprehensive error reporting

### Terminal Integration
The extension supports launching AI assistants in multiple terminal applications:
- **Terminal.app**: Native macOS terminal
- **iTerm**: Advanced terminal emulator
- **Custom terminals**: User-specified terminal applications
- **Current directory detection**: Automatically detects and uses the current Finder window directory or user home directory

### State Management
- Tracks installed version, latest version, and status for each tool
- Async data loading with cancellation support using AbortController
- Real-time updates after version checks or installations
- Settings persistence across extension sessions
- Uses React hooks (useState, useEffect) for local state management

### Type Definitions
Key types used across the application:
- `ToolId`: Union type for supported AI tools ("claude" | "gemini" | "qwen" | "yolo")
- `PackageManagerId`: Package manager types ("npm" | "pnpm" | "yarn")
- `TerminalId`: Terminal application types ("terminal" | "iterm" | "custom")
- `Settings`: Interface for user settings configuration
- `ToolConfig`: Interface for AI tool configuration

### Error Handling Patterns
The application uses consistent error handling patterns:
- `showFailureToast()` from `@raycast/utils` for error notifications
- Try-catch blocks around async operations
- Graceful fallbacks for directory detection and command execution
- User-friendly error messages with actionable feedback

### Performance Optimizations
- Batch updates using `Promise.allSettled()` for multiple tool operations
- Request cancellation to prevent race conditions during rapid successive operations
- Efficient version checking with caching strategies
- Minimal re-renders through careful state management

## Development Guidelines

### Code Organization
- Each command component is self-contained with its own logic
- Shared utilities should be abstracted to prevent code duplication
- Type definitions should be consistent across all components
- Follow React best practices for hooks and component structure

### Security Best Practices
- Always escape user-provided input before shell execution
- Validate and sanitize all external inputs
- Use parameterized commands rather than string concatenation
- Implement proper error boundaries and fallback mechanisms

### Testing and Quality
- Run `pnpm run lint` before committing changes
- Use TypeScript strict mode for type safety
- Test shell command execution with various edge cases
- Verify error handling works correctly for all failure scenarios

### Extension Publishing
- Use `pnpm run publish` to publish to Raycast Store
- Ensure all commands work correctly before publishing
- Test on different macOS versions and terminal configurations
- Update version numbers and changelog before releasing new versions