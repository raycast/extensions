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
- Raycast CI uses `npm ci` which requires `package-lock.json` in sync - must be tracked in git
- Monorepo fork: `~/.config/raycast/public-extensions-fork/`
- If `ray publish` fails with OAuth scope error, manually sync fork at https://github.com/pa1ar/raycast-extensions
- Bug reports come from https://www.raycast.com/pa1ar/finder-file-actions (extension issues tab)

## Architecture

### Entry Points
- `src/move-to-folder.tsx` - main command, handles both move and copy modes via `props.arguments.mode`
- `src/copy-to-folder.tsx` - imports and renders move-to-folder Command directly with `mode: "copy"` (not via launchCommand - that breaks when move-to-folder is disabled)

### Core Modules
- `src/common/search-spotlight.tsx` - folder search using `mdfind`, returns `Promise<SpotlightSearchResult[]>` (no callback arg - see Gotchas)
- `src/common/finder.ts` - shared Finder AppleScript helpers: `isFinderFrontmost`, `getCurrentFinderDirectory`, `selectInFinder`, `generateUniqueName`
- `src/common/fs-async.ts` - async file operations with progress tracking, uses streaming for files >10MB, batch processing with configurable concurrency
- `src/common/cache-manager.ts` - singleton for pinned folders, uses LocalStorage, 24hr cache validity
- `src/libs/node-spotlight/` - wrapper around macOS `mdfind` command, streams results

## Gotchas (things that broke before - do not reintroduce)

- **Never pass inline callbacks in a `usePromise` deps array.** `usePromise(fn, [dep1, dep2, (r) => setX(r)])` creates a new function reference every render, which changes the deps, which aborts the in-flight promise and restarts it. Combined with any state update in `onWillExecute` (e.g. `setIsQuerying(true)`) this creates an infinite abort/restart loop and search never completes. Pattern: make the search function return results via `Promise<T>`, consume them in `onData`, and keep the deps array to stable primitives/refs only.
- **Never spawn `osascript` per search keystroke.** Under fast typing the spawns back up and hit `spawn osascript EAGAIN` ("resource temporarily unavailable"), killing the search. Spotlight's `mdfind` finds system folders (Desktop, Documents, etc.) naturally via `kMDItemDisplayName`/`kMDItemPath` - no AppleScript needed at query time.
- **`canExecute` as a one-shot latch gating `usePromise` is dangerous.** Flipping it to `false` inside `onWillExecute` causes the next render to re-evaluate `execute` as `false`, which makes `usePromise` abort the request it just started. If you need gating, use only stable conditions (`hasCheckedPreferences && !!searchText`).

## Standalone test harness

`scripts/test-search-wrapper.ts` runs `searchSpotlight` logic outside Raycast:

```bash
bun run scripts/test-search-wrapper.ts <query>
```

Use this to verify the search path independently of React/Raycast when debugging regressions. A green run here + a broken extension means the bug is in the React integration, not the search code itself.

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

## Raycast Docs Reference (local copies in docs/)

Fetched 2026-04-06. URLs moved from `/utils-reference/` to `/utilities/` - use `.md` suffix for direct markdown.

| File | What it covers |
|------|---------------|
| `docs/raycast-utils-getting-started.md` | @raycast/utils installation, changelog, peer deps |
| `docs/raycast-usePromise.md` | usePromise hook - signature, options (execute, onData, onError, onWillExecute), mutation |
| `docs/raycast-useFetch.md` | useFetch hook - wrapper around usePromise + fetch, options, pagination |
| `docs/raycast-useForm.md` | useForm hook - form validation, field handlers |
| `docs/raycast-useCachedPromise.md` | useCachedPromise - usePromise + caching layer, initialData, keepPreviousData |
| `docs/raycast-useCachedState.md` | useCachedState - persistent state across command runs |
| `docs/raycast-useSQL.md` | useSQL hook - SQLite queries, permissionPriming |
| `docs/raycast-useAI.md` | useAI hook - AI text generation in extensions |
| `docs/raycast-showFailureToast.md` | showFailureToast utility function |
| `docs/raycast-ai-api.md` | AI API reference - AI.ask, models, creativity settings |
| `docs/raycast-best-practices.md` | Extension best practices - UX patterns, performance |
| `docs/raycast-menu-bar-commands.md` | MenuBarExtra component, menu bar command patterns |
