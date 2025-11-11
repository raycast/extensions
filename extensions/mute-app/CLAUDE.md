# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Raycast extension** for Windows that allows users to mute individual running applications. It provides a UI for listing all running apps and controlling their audio output.

**Platform**: Windows only (specified in package.json:38)
**Framework**: Raycast API (@raycast/api)
**Language**: TypeScript with React JSX

## Development Commands

### Development workflow
- `npm run dev` - Start Raycast development mode (launches `ray develop`)
- `npm run build` - Build the extension (`ray build`)
- `npm run lint` - Lint code using ESLint (`ray lint`)
- `npm run fix-lint` - Auto-fix linting issues (`ray lint --fix`)

### Publishing
- `npm run publish` - Publish to Raycast Store (uses `npx @raycast/api@latest publish`)
- **Note**: This extension should NOT be published to npm (protected by prepublishOnly script)

## Architecture

### Entry Point
- `src/mute-app.ts` - Main command implementation
  - Command mode: "view" (renders a React component for listing/selecting apps)
  - Title: "Mute App"
  - Description: "Lists all running apps, and allows muting one"

### Utilities
- `src/utils/getRunningProcesses.ts` - Windows-specific logic for enumerating running processes

### Type Definitions
- `raycast-env.d.ts` - Auto-generated from package.json manifest
  - Defines ExtensionPreferences, Preferences namespace, and Arguments namespace
  - **Do not modify manually** - update package.json instead

## Raycast Extension Structure

### Commands
Commands are defined in package.json under the "commands" array. Each command has:
- `name`: Internal identifier
- `title`: Display name in Raycast
- `description`: User-facing description
- `mode`: Execution mode ("view" for UI-based commands, "no-view" for background commands)

### Extension Categories
- Category: "Media"
- Platform: Windows only

## Key Dependencies

- `@raycast/api` (^1.103.0) - Core Raycast API for building UI and interacting with the system
- `@raycast/utils` (^2.2.1) - Utility functions for Raycast extensions
- `@raycast/eslint-config` - Raycast's ESLint configuration (extends automatically)

## TypeScript Configuration

- Target: ES2023
- Module: CommonJS
- Strict mode enabled
- JSX: react-jsx (React 17+ JSX transform)
- Isolated modules enabled for faster compilation

## Code Style

- Prettier configuration:
  - Print width: 120 characters
  - Single quotes: false (use double quotes)
- ESLint: Uses Raycast's official config (@raycast/eslint-config)

## Windows-Specific Considerations

Since this extension is Windows-only, you'll need to:
- Use Windows APIs or Node.js modules that work on Windows for process enumeration
- Consider using PowerShell commands or Windows native APIs to control application audio
- Test on Windows environment (Raycast for Windows is required)

## Development Notes

- The raycast-env.d.ts file regenerates when you modify package.json
- Use Raycast's built-in components from @raycast/api (List, Action, ActionPanel, etc.)
- For controlling application audio on Windows, consider using:
  - Windows Audio Session API (WASAPI) via native modules
  - PowerShell commands with child_process
  - Third-party npm packages for Windows audio control
