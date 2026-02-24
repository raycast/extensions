# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension that retrieves usage information for Kimi for Coding. It runs as a "no-view" command (no UI, just shows HUD notifications or toasts).

## Commands

```bash
# Development
npm run dev          # Start development mode with hot reload
npm run build        # Build the extension

# Code Quality
npm run lint         # Run ESLint
npm run fix-lint     # Auto-fix linting issues

# Publishing
npm run publish      # Publish to Raycast Store
```

## Architecture

- **Entry point**: `src/kimi-for-coding-usage.ts` - The main command file
- **Type definitions**: `raycast-env.d.ts` - Auto-generated from `package.json` manifest (do not edit manually)
- **Config**: Uses `@raycast/eslint-config` for linting, TypeScript with ES2023 target

## Raycast Extension Conventions

- Commands are defined in `package.json` under the `commands` array
- Each command maps to a file in `src/` with the same name
- Use `@raycast/api` for UI components (List, Form, Action, showHUD, showToast, etc.)
- Use `@raycast/utils` for common utilities (useFetch, usePromise, etc.)
- Preferences are defined in `package.json` and accessed via `getPreferenceValues()`
