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
- Dual-command extension: version management and settings configuration

### Key Features
- **Multi-Tool Support**: Currently supports Claude Code, Gemini CLI, Qwen Code CLI, and YOLO agent
- **Version Tracking**: Compares installed versions with latest npm versions
- **Update Management**: Provides different update mechanisms (CLI updates vs npm global installs)
- **Settings Management**: Configure default AI agent and package manager preferences
- **Real-time Status**: Shows up-to-date, outdated, or unknown status for each tool

### Technical Implementation
- Uses `@raycast/api` for UI components and actions
- Executes shell commands via `runInLoginShell` function to check versions and perform updates
- Implements robust error handling with toast notifications
- Uses React hooks for state management and async operations
- Supports multiple version flag detection (`-v`, `--version`, `version`)
- Settings persistence using Raycast's LocalStorage API

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

### Shell Execution
All commands run in login shell (`zsh`) to ensure proper environment and PATH access. The extension handles both stdout and stderr parsing for comprehensive error reporting.

### State Management
- Tracks installed version, latest version, and status for each tool
- Async data loading with cancellation support
- Real-time updates after version checks or installations
- Settings persistence across extension sessions