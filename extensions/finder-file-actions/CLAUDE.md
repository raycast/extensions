# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raycast extension for moving/copying files selected in Finder to destination folders. Uses macOS Spotlight (`mdfind`) for fast folder search.

## Commands

```bash
# Development
bun install          # install dependencies
bun run dev          # start in development mode (creates symlink in Raycast)
bun run build        # build to dist/

# Testing
bun test             # run all tests
bun test <pattern>   # run specific test file (e.g., bun test pinning)

# Linting
bun run lint         # validate manifest and lint code
bun run fix-lint     # auto-fix lint issues
```

## Publishing Workflow

This extension is live in the Raycast Store. Standalone repo publishes to the Raycast extensions monorepo.

### Pre-publish checklist

1. Update `@raycast/api` and `@raycast/utils` to latest (`bun update @raycast/api @raycast/utils`)
2. Run all checks: `bun run lint && bun test && bun run build`
3. Commit all changes (working tree must be clean, including no untracked files)
4. Pull external contributions: `npx @raycast/api@latest pull-contributions`
5. Publish: `npx ray publish` - syncs to fork, creates PR in raycast/extensions monorepo
6. Update CHANGELOG.md with `## [Title] - {PR_MERGE_DATE}` format (date placeholder replaced on merge)

### Notes

- Raycast CI uses npm; `package-lock.json` is gitignored here but `ray publish` handles it
- Monorepo fork: `~/.config/raycast/public-extensions-fork/`
- If `ray publish` fails with OAuth scope error, manually sync fork at https://github.com/pa1ar/raycast-extensions
- Bug reports come from https://www.raycast.com/pa1ar/finder-file-actions (extension issues tab)

## Architecture

### Entry Points

- `src/move-to-folder.tsx` - main command, handles both move and copy modes via `props.arguments.mode`
- `src/copy-to-folder.tsx` - imports and renders move-to-folder Command directly with `mode: "copy"` (not via launchCommand - that breaks when move-to-folder is disabled)

### Core Modules

- `src/common/search-spotlight.tsx` - folder search using `mdfind`, handles system folders (Desktop, Documents, etc.) with localized names
- `src/common/fs-async.ts` - async file operations with progress tracking, uses streaming for files >10MB, batch processing with configurable concurrency
- `src/common/cache-manager.ts` - singleton for pinned folders, uses LocalStorage, 24hr cache validity
- `src/libs/node-spotlight/` - wrapper around macOS `mdfind` command, streams results

### State Management

Uses React hooks with Raycast's LocalStorage for persistence:

- Recent folders: `${extensionName}-recent-folders`
- Pinned folders: `${extensionName}-pinned-folders`
- Detail view preference: `${extensionName}-show-details`

### Key Types (`src/common/types.ts`)

- `SpotlightSearchResult` - folder metadata from mdfind (path, dates, use count)
- `PinnedFolder` - extends SpotlightSearchResult with pinnedAt, lastVerified
- `RecentFolder` - extends SpotlightSearchResult with lastUsed (defined in move-to-folder.tsx)

## Testing

Tests use Jest with ts-jest. Raycast API is mocked in `src/tests/setup.ts`.

Test files:

- `file-operations.test.ts` - move/copy operations
- `fs-operations.test.ts` - fsAsync module
- `navigation.test.ts` - folder navigation
- `pinning.test.ts` - pin/unpin functionality

Test helpers in `src/tests/utils/test-helpers.ts` create temp directories for isolation.
