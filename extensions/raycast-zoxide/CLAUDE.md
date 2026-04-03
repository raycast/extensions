# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run build` — Build the extension (`ray build`)
- `npm run dev` — Run in development mode (`ray develop`)
- `npm run lint` — Lint the codebase (`ray lint`)
- `npm run fix-lint` — Auto-fix lint issues (`ray lint --fix`)
- `npm run publish` — Publish to Raycast Store

No test framework is configured.

## Architecture

This is a **Raycast extension** that integrates with [zoxide](https://github.com/ajeetdsouza/zoxide) (a smarter `cd` command) and [fzf](https://github.com/junegunn/fzf) for fuzzy filtering. macOS only.

### Commands (entry points in `src/`)

- **`search-directories.tsx`** — Main search view. Queries zoxide for all scored directories, pipes results through fzf for fuzzy filtering, and displays matches. Falls back to Spotlight search when no results are found.
- **`add-from-finder.tsx`** — No-view command. Gets the selected/open folder from Finder via AppleScript and adds it to zoxide's database.

### Key patterns

- **Hooks** (`src/hooks/`) wrap CLI tools using `useExec` from `@raycast/utils`:
  - `useZoxide` — runs `zoxide <command>` with correct PATH
  - `useFzf` — runs `fzf --filter` against piped input (zoxide output)
  - `useSpotlight` — runs `mdfind` for directory search fallback

- **Path handling** (`src/utils/path-helpers.ts`):
  - `pathFor(command)` builds the `PATH` env var, prepending user-configured additional paths (from preferences) to defaults like `/opt/homebrew/bin`
  - `makeFriendly` / `makeUnfriendly` swap system paths for display names (e.g., iCloud Drive path ↔ "iCloud Drive", `$HOME` ↔ `~`)

- **Shell injection prevention** (`src/utils/misc.ts`): `base64ShellSanitize` encodes user input as base64 and decodes it inline in the shell command, avoiding direct string interpolation.

### Import aliases (configured in `tsconfig.json`)

- `@components/*` → `src/components/*`
- `@hooks/*` → `src/hooks/*`
- `@utils/*` → `src/utils/*`

### Preferences (defined in `package.json`)

- `open-in` — Application picker for opening directories (default: Finder)
- `addl-paths` — Additional `PATH` directories for finding zoxide/fzf binaries
