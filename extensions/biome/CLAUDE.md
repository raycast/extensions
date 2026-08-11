# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **Raycast Extension** that provides quick access to Biome documentation. Raycast is a macOS/Windows productivity tool that allows developers to create custom commands and extensions.

## Quick Reference

### Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Build extension for distribution
npm run build

# Run linting (ESLint)
npm run lint

# Fix linting issues automatically
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

## Architecture Overview

### Project Structure

```
src/
├── search-documentation.tsx    # Main command component (entry point)
assets/
├── extension-icon.png         # Extension icon
package.json                   # Dependencies and scripts
tsconfig.json                  # TypeScript configuration
eslint.config.js              # ESLint configuration
```

### How It Works

The extension exposes a single Raycast command: **"Search Documentation"**

1. **Entry Point**: `src/search-documentation.tsx`
   - Exports default React component that serves as the command UI
   - Uses Raycast API components (`List`, `ActionPanel`, `Detail`, etc.)
   - Currently displays a basic list item with a greeting detail

2. **Component Pattern**:
   - Raycast commands are React components
   - Use Raycast API hooks and components for UI (no custom styling needed)
   - Actions are defined via `ActionPanel` for command interactions
   - Navigation between views uses `Action.Push`

### Raycast API Essentials

- **List**: Main list view component for displaying items
- **Detail**: View for displaying markdown or rich content
- **ActionPanel**: Container for actions available to user
- **Action**: Individual actions (Push, Open, Copy, etc.)
- **Icon**: Raycast built-in icon library

## Tech Stack

- **Runtime**: Node.js (TypeScript)
- **UI Framework**: React 19 with JSX
- **API**: Raycast API (`@raycast/api` and `@raycast/utils`)
- **Language**: TypeScript 5.8.2 (strict mode enabled)
- **Linter**: ESLint with Raycast config
- **Formatter**: Prettier
- **Build Tool**: Raycast CLI (`ray` command)

## Code Style

- **Quotes**: Double quotes (Raycast convention)
- **JSX**: React 19 with automatic JSX transform
- **Target**: ES2023 with commonjs modules
- **React**: Functional components with hooks

## Key Files

- **package.json**: npm scripts use `ray` CLI (Raycast command-line tool)
- **tsconfig.json**: Strict TypeScript, React 19 JSX transform
- **eslint.config.js**: Extends `@raycast/eslint-config`

## Common Development Tasks

### Adding a New Command

1. Create new file in `src/my-new-command.tsx`
2. Export a default React component
3. Add entry to `package.json` commands array:
   ```json
   {
     "name": "my-new-command",
     "title": "My Command Title",
     "description": "Command description",
     "mode": "view"
   }
   ```
4. Use Raycast API components for UI

### Testing Changes

```bash
npm run dev
```

This launches the Raycast development environment where you can test commands in real-time with hot reload.

### Building for Distribution

```bash
npm run build
```

Creates optimized build ready for Raycast Store submission. Always build before publishing.

## Environment

- **Platforms**: macOS and Windows (specified in package.json)
- **Raycast API Version**: ^1.103.6
- **Node Version**: 22+ (based on @types/node 22.13.10)

## Resources

- **Raycast API Docs**: https://developers.raycast.com
- **Extension Schema**: https://www.raycast.com/schemas/extension.json (referenced in package.json)
- **Official Examples**: Raycast GitHub organization has many example extensions

## Development Workflow

1. Make changes to TypeScript/React files in `src/`
2. Run `npm run dev` to test in Raycast environment
3. Use `npm run fix-lint` to fix any linting issues
4. When ready, run `npm run build`
5. Test thoroughly before running `npm run publish`
- dont use NPM but only bun please
- dont use interfaces, just types