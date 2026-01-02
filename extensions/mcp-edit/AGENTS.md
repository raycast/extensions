# Repository Guidelines

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Edit is a Raycast extension that provides quick access to edit MCP (Model Context Protocol) configuration files across multiple AI coding assistants and tools. The extension displays a searchable list of MCP clients and allows users to open their configuration files in various editors (Cursor, VS Code, Zed, Sublime Text).

## Architecture

### Single Command Extension

This is a single-command Raycast extension with one primary command: `list-mcp-configurations`. The entire UI and logic is contained in [src/list-mcp-configurations.tsx](src/list-mcp-configurations.tsx).

### MCP Client Configuration System

The extension manages a predefined list of MCP clients (`MCP_CLIENTS` array) where each client has:
- `id`: kebab-case identifier used for preference key generation
- `name`: display name shown in the UI
- `icon`: Raycast icon for the list item
- `filePath`: user-configured path to the MCP config file (from preferences)

**Preference Key Convention**: Client IDs are converted to camelCase and suffixed with either "Path" (for config path) or prefixed with "show" (for visibility toggle). For example:
- `claude-code` → `claudeCodePath` and `showClaudeCode`
- `copilot-cli` → `copilotCliPath` and `showCopilotCli`

The `getPreferenceKey()` and `toCamelCase()` functions handle this conversion automatically.

### Path Expansion

The `expandPath()` function normalizes file paths by:
1. Expanding `~` and `~/` to the user's home directory
2. Resolving relative paths to absolute paths

Paths are stored in two forms:
- `filePath`: raw user input from preferences
- `expandedPath`: resolved absolute path (computed once during initialization)

### Editor Integration

Opening files in editors is done via macOS `open -a` command. Each editor has a dedicated async function (`openInCursor`, `openInVSCode`, `openInZed`, `openInSublime`) that:
1. Ensures a config path is set (throws error if not)
2. Executes the `open` command with the expanded path
3. Closes the Raycast window
4. Shows a success/failure toast

## Project Structure & Module Organization

Store icons and other static assets in `assets/` (e.g., `extension-icon.png`). Build metadata lives in `package.json`, with compiler settings in `tsconfig.json`, linting rules in `eslint.config.js`, and Raycast-specific types in `raycast-env.d.ts`. Add reusable helpers under a new `src/lib/` directory when the command file gets crowded, and keep user-facing changes logged in `CHANGELOG.md`.

## Build, Test, and Development Commands

- `npm install` prepares dependencies and Ray CLI bindings; run after pulling.
- `npm run dev` (`ray develop`) launches the Raycast simulator with live reload for UI iteration.
- `npm run build` (`ray build`) verifies the manifest and TypeScript types ahead of publishing.
- `npm run lint` enforces the Raycast ESLint preset and fails on style or type issues.
- `npm run fix-lint` applies available auto-fixes before manual cleanup.
- `npm run publish` runs Raycast's publishing workflow; use only after review and a green build.

## TypeScript Configuration

- Target: ES2023
- Module: CommonJS
- JSX: React JSX transform
- Strict mode enabled with `isolatedModules` and `forceConsistentCasingInFileNames`

## Coding Style & Naming Conventions

Write TypeScript with React function components and Raycast UI primitives. Prefer 2-space indentation, single quotes, and trailing commas per ESLint + Prettier defaults. Prefix hooks or stateful helpers with `use` (e.g., `useConfigurationList`). Export shared configuration descriptors in SCREAMING_SNAKE_CASE constants, keep temporary values camelCase, and centralize provider labels near the command to simplify localization.

## Testing & Validation

There is no automated test suite yet, so rely on linting plus manual verification. Run `npm run lint` before every commit, then exercise new flows in `ray develop`, toggling preference flags and simulating missing config files. If you add logic-heavy helpers, place Jest specs under `src/__tests__/` mirroring the source tree, and wire them into the lint or future test scripts to avoid regressions.

## Commit & Pull Request Guidelines

Mirror the conventional commits pattern already in history (`feat:`, `fix:`, `chore:`) and keep each commit focused. Pull requests should include a concise summary, testing notes (commands executed plus Raycast screenshots or GIFs for UI tweaks), links to any tracked issues, and confirmation that lint and build scripts pass. Call out configuration files or paths that reviewers must set locally, and request review before running `npm run publish`.

## Adding New MCP Clients

To add support for a new MCP client:

1. Add entry to `MCP_CLIENTS` array in [src/list-mcp-configurations.tsx](src/list-mcp-configurations.tsx)
2. Add two preferences in [package.json](package.json) `commands[0].preferences`:
   - Checkbox preference: `show{ClientName}` (e.g., `showNewClient`)
   - Textfield preference: `{clientName}Path` (e.g., `newClientPath`)
3. Ensure the client ID uses kebab-case (e.g., `new-client`)

The extension automatically handles preference key generation and visibility filtering based on the naming convention.
