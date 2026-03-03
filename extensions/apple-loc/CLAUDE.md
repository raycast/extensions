# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raycast extension that provides a UI for searching Apple localizations (translations extracted from macOS/iOS system frameworks). It wraps an external `apple-loc` CLI tool that queries a SQLite database.

## Commands

```bash
npm run dev        # Start Raycast development with hot reload
npm run build      # Build the extension
npm run lint       # Lint with Raycast ESLint config
npm run fix-lint   # Auto-fix lint issues
npm run publish    # Publish to Raycast Store
```

No test framework is configured.

## Architecture

The extension has three Raycast commands (each a default-export React component in `src/`):

- **search-localizations** — full-text search via `apple-loc search`
- **lookup-by-key** — key lookup with fuzzy matching via `apple-loc lookup --key --fuzzy`
- **lookup-by-target** — translated text lookup via `apple-loc lookup --target`

All three follow the same pattern: state for search text, platform filter, and language filter, with `useExec` from `@raycast/utils` to shell out to the CLI and parse JSON output.

**shared.tsx** contains all shared logic:
- Preference resolution (`getCliPath`, `getDbPath`) with defaults to `~/.local/bin/apple-loc` and `~/.apple-loc/apple-loc.db`
- `useInfo()` hook — calls `apple-loc info` to get available platforms/languages
- `buildArgs()` / `parseCLIOutput()` — CLI argument construction and JSON parsing
- `PlatformDropdown` and `ResultListItem` — reusable UI components
- Error handling with user-friendly toast messages for missing CLI or invalid database

## Key Conventions

- CLI output is always JSON; results are limited to 20 per query
- Language filter state is persisted across sessions via `useCachedState`
- Platform strings follow `{os}{version}` format (e.g., `macos15`, `ios18`), formatted for display by `formatPlatformLabel()`
- `raycast-env.d.ts` is auto-generated from `package.json` manifest — do not edit manually
- Prettier: 120 char width, double quotes
