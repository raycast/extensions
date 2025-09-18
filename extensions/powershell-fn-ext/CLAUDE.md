# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for Windows that lists and executes PowerShell functions from a user-defined script file. The extension parses PowerShell scripts to extract parameter-less functions and allows execution through the Raycast interface.

## Development Commands

**Primary development workflow:**
- `npm run dev` - Start development mode (adds extension to Raycast)
- `npm run build` - Build the extension for distribution
- `npm run lint` - Run ESLint checks
- `npm run fix-lint` - Auto-fix linting issues
- `npm run publish` - Publish to Raycast store

**Installation (from README):**
- Install Node.js: `winget install -e --id OpenJS.NodeJS`
- Clone repository and run: `npm ci` then `npm run dev`

## Architecture

### Core Components

**Main Command (`src/execute-powershell-function.tsx`):**
- Single-file React component using Raycast API
- Implements function discovery, caching, and execution
- Uses Node.js `child_process` to execute PowerShell via `pwsh.exe`

### Key Features

**PowerShell Function Parser:**
- Parses `.ps1` files to extract functions using regex: `/function ([\w-]+)/`
- Supports custom icons via comments: `# @raycast.icon Icon.Name`
- Only lists parameter-less functions for execution

**Caching System:**
- File-based caching using Raycast's Cache API
- Cache invalidation based on file modification time (`mtime`)
- Cache keys: `functions-${filePath}`

**Path Resolution:**
- Supports `~` expansion to home directory using `homedir()`
- Uses `realpathSync()` for path resolution
- Validates file existence with `existsSync()`

**PowerShell Execution:**
- Command template: `. '${escapedPath}'; ${functionName}`
- Uses `pwsh.exe -NoProfile -ExecutionPolicy Bypass`
- Implements path escaping for PowerShell compatibility

### Configuration

**User Preferences (via Raycast):**
- `scriptPath`: Path to PowerShell script file (default: `~\scripts\my_ps1_functions.ps1`)

### Error Handling

- Path validation errors show dedicated error view
- Function parsing errors with detailed messages
- Execution errors displayed via Toast notifications
- Graceful fallbacks for invalid icons

## Code Patterns

**React Hooks:**
- `usePromise` from `@raycast/utils` for async data fetching
- `useState` for component state management
- `useEffect` for path resolution on preference changes

**TypeScript Interfaces:**
- `PowerShellFunction`: `{ name: string, icon: string }`
- `CachedFunctions`: `{ mtime: string, functions: PowerShellFunction[] }`
- `Preferences`: `{ scriptPath: string }`

**Component Structure:**
- Main `Command` component with conditional rendering
- Separate components for error states and list items
- ActionPanel integration for user interactions

## Platform Requirements

- Windows platform only (specified in package.json)
- Requires PowerShell Core (`pwsh.exe`)
- Raycast extension framework