# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Proj** - A Raycast extension that scans project directories, organizes them into collections, and lets users quickly open projects in their preferred IDE. Built with TypeScript and React using the Raycast API.

## Commands

```bash
bun run dev       # Start development mode with hot reload
bun run build     # Build the extension to dist/
bun run lint      # Run ESLint
bun run fix-lint  # Auto-fix linting issues
bun test          # Run tests
```

## Architecture

**Raycast Commands:**

- [src/projects.tsx](src/projects.tsx) - Main UI for browsing and opening projects
- [src/project-collections.tsx](src/project-collections.tsx) - UI for managing collections
- [src/add-projects.tsx](src/add-projects.tsx) - Form for adding single projects or source folders

**Core Logic:**

- [src/utils.ts](src/utils.ts) - Project scanning (`findProjects`), language detection, git org extraction
- [src/settings.ts](src/settings.ts) - Per-project settings (display name, icon, IDE override)
- [src/sources.ts](src/sources.ts) - Multiple source directory management
- [src/collections.ts](src/collections.ts) - Manual and auto collection management
- [src/manual-projects.ts](src/manual-projects.ts) - Manually added project management
- [src/search.ts](src/search.ts) - Search query parsing (`#collection`, `lang:`, `org:`, `in:`)
- [src/recency.ts](src/recency.ts) - Last-opened tracking and relative time formatting
- [src/types.ts](src/types.ts) - Shared TypeScript types and auto-collection definitions

**Projects Module (extracted components):**

- [src/projects/](src/projects/) - Extracted components and hooks for the projects list
- [src/projects/components/ProjectListItem.tsx](src/projects/components/ProjectListItem.tsx) - Individual project list item with actions
- [src/projects/components/SearchSuggestionsList.tsx](src/projects/components/SearchSuggestionsList.tsx) - Search filter suggestions
- [src/projects/hooks/useProjects.ts](src/projects/hooks/useProjects.ts) - Project loading and state management

**Forms:**

- [src/ProjectSettingsForm.tsx](src/ProjectSettingsForm.tsx) - Edit project settings
- [src/CollectionForm.tsx](src/CollectionForm.tsx) - Create/edit collections
- [src/AddToCollectionForm.tsx](src/AddToCollectionForm.tsx) - Add project to collection

**Project Detection:**

- Scans directories recursively up to configurable depth (1-4 levels)
- Marker files: `.git`, `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `requirements.txt`, `Gemfile`, `composer.json`, `Package.swift`, `pubspec.yaml`, `mix.exs`, `build.sbt`, `pom.xml`, `build.gradle`, `CMakeLists.txt`, `Makefile`
- Excluded directories: `node_modules`, `.git`, `dist`, `build`, `vendor`, `target`, `.next`, `.venv`, `venv`, `__pycache__`, `.cache`, `coverage`, `.turbo`, `.output`

**Data Storage (in Raycast's support directory):**

- `project-settings.json` - Per-project customization (includes lastOpened timestamps)
- `sources.json` - Configured source directories
- `collections.json` - User-created collections
- `manual-projects.json` - Manually added projects (not from source scanning)

## Key Implementation Details

- Uses synchronous `fs` operations for directory scanning
- Supports tilde expansion for paths (`~/...`)
- Auto-detects project language from marker files
- Extracts git organization from `.git/config` remote URL
- Auto collections: Recent (7 days), This Month (30 days), Stale (90+ days), Uncategorized
- Missing project detection: projects that no longer exist at their path can be relocated or removed
- Two ways to add projects: source folders (scan for multiple) or manual addition (single projects)
