# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Raycast extension that scans a configurable projects directory and lets users quickly open projects in their preferred IDE. Built with TypeScript and React using the Raycast API.

## Commands

```bash
bun run dev       # Start development mode with hot reload
bun run build     # Build the extension to dist/
bun run lint      # Run ESLint
bun run fix-lint  # Auto-fix linting issues
bun test          # Run tests
```

## Architecture

**Source files:**

- [src/open-project.tsx](src/open-project.tsx) - React component for the Raycast command UI
- [src/utils.ts](src/utils.ts) - Project scanning logic (`expandPath`, `isProject`, `findProjects`)
- [src/settings.ts](src/settings.ts) - Per-project settings storage (display name, icon, IDE override)
- [src/ProjectSettingsForm.tsx](src/ProjectSettingsForm.tsx) - Form UI for editing project settings

**Project Detection:**
- Scans directories recursively up to a configurable depth (1-4 levels)
- Identifies projects by marker files: `.git`, `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`, `pom.xml`, `build.gradle`, `CMakeLists.txt`
- Excludes common build/cache directories: `node_modules`, `.git`, `dist`, `build`, `vendor`, `target`, `.next`, `.venv`, `venv`, `__pycache__`, `.cache`, `coverage`, `.turbo`, `.output`

**User Preferences (configured in Raycast):**
- `ide` - Application picker for the IDE to use
- `projectsDirectory` - Root directory to scan (default: `~/Documents/projects`)
- `searchDepth` - How deep to scan (1-4 levels, default: 2)

## Key Implementation Details

- Uses synchronous `fs` operations (`readdirSync`, `statSync`, `existsSync`) for directory scanning
- Supports tilde expansion for paths (`~/...`)
- Results sorted alphabetically by project name
- Error handling shows toast notifications on scan failures
- Per-project settings stored in `project-settings.json` in Raycast's support directory
