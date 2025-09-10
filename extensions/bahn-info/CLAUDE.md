# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension called "Bahn Info" for getting information about Deutsche Bahn (German railway) rides. It's a TypeScript-based extension using the Raycast API framework.

## Development Commands

- `npm run dev` - Start development mode with live reload
- `npm run build` - Build the extension for production
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Auto-fix linting issues
- `npm run publish` - Publish to Raycast Store

## Architecture

### Core Structure
- **Entry point**: `src/bahn-info.tsx` - Main command implementation
- **Configuration**: `package.json` - Extension manifest with command definitions
- **Types**: `raycast-env.d.ts` - Auto-generated type definitions (do not modify)

### Technology Stack
- **Framework**: Raycast API (@raycast/api)
- **Language**: TypeScript with strict mode enabled
- **UI Components**: Raycast's native List, ActionPanel, and Action components
- **Build Tool**: Raycast CLI (`ray` commands)

### Command Configuration
The extension defines a single command "bahn-info" with:
- Mode: `no-view` (headless command)
- Category: Fun
- Icon: `extension-icon.png`

## Code Style
- **Prettier**: 120 character line width, double quotes
- **ESLint**: Uses `@raycast/eslint-config`
- **TypeScript**: ES2022 target with strict mode and isolated modules

## Node Version
- Required: Node.js 20.5.0 (specified in `.nvmrc`)

## Important Notes
- The `raycast-env.d.ts` file is auto-generated from the manifest and should not be manually edited
- Extension uses `no-view` mode, meaning it runs without a UI
- Dependencies are managed through `@raycast/api` and `@raycast/utils`