# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Raycast extension for Windows that changes screen refresh rates. It uses the Raycast API and is configured as a single-command extension.

**Platform**: Windows only (specified in package.json)

**Current Implementation Note**: The main command file `src/change-refresh-rate.ts` currently contains placeholder code (copying date to clipboard) and needs to be implemented with actual screen refresh rate functionality.

## Architecture

### Project Structure

- `src/`: Contains TypeScript command implementations
  - `change-refresh-rate.ts`: Main command entry point (note: filename has typo "refresh" instead of "refresh")
- `assets/`: Extension icon and visual resources
- `package.json`: Raycast extension manifest defining commands, metadata, and dependencies

### Key Dependencies

- `@raycast/api`: Core Raycast API for building extensions
- `@raycast/utils`: Utility functions for Raycast development
- TypeScript with strict mode enabled (ES2023 target)

### Extension Configuration

The extension is defined in `package.json` with:

- Single command: "Change refresh rate" (command name: `change-refresh-rate`)
- Category: Developer Tools
- Windows-only platform restriction

## Development Commands

### Development & Testing

```powershell
bun run dev
```

Launches Raycast in development mode for live testing of the extension.

### Building

```powershell
bun run build
```

Creates a production build using the Raycast CLI.

### Linting

```powershell
bun run lint          # Check for linting issues
bun run fix-lint      # Auto-fix linting issues
```

Uses Raycast's ESLint configuration (`@raycast/eslint-config`).

### Publishing

```powershell
bun run publish
```

Publishes the extension to the Raycast Store (not npm).

## Code Standards

### TypeScript Configuration

- Strict mode enabled
- ES2023 target and lib
- CommonJS modules
- React JSX support (react-jsx transform)
- Isolated modules for better build performance

## Windows-Specific Considerations

This extension is Windows-only. When implementing screen refresh rate changes

## Known Issues

1. **Placeholder implementation**: The current `change-refresh-rate.ts` implementation copies the current date to clipboard instead of changing refresh rates.
