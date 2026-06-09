# AGENTS.md

## Scope

This repository is a Raycast extension for searching FMHY resources. The repository root is the extension root; run package commands from this directory unless a nested AGENTS file says otherwise.

## Folder Guide

- `.github/`: GitHub automation and repository workflow files.
- `assets/`: Static assets packaged with the extension.
- `docs/`: Human-readable development and maintenance documentation.
- `src/`: Raycast command entry points.
- `src/lib/`: Shared parsing, cache, fetching, formatting, and search helpers.

## Architecture Overview

**Single-command extension** (`search-fmhy.tsx`) with clean separation of concerns:

```
UI & Orchestration (search-fmhy.tsx)
    ↓
Helpers (src/lib/)
    ├── fmhy-api.ts      → Fetch markdown, delegate to parser
    ├── parser.ts        → Parse markdown → normalized index
    ├── fmhy-url.ts      → FMHY route/anchor normalization helpers
    ├── cache.ts         → Versioned storage with 24hr TTL
    ├── search.ts        → Token-based filtering
    ├── format.ts        → UI display helpers
    ├── errors.ts        → Human-readable error messages
    └── types.ts         → Shared TypeScript interfaces
```

## Data Flow

1. **Load**: Read the versioned Raycast cache first. Cached data should render immediately, even when stale.
2. **Fetch**: HTTP GET to `https://api.fmhy.net/single-page` (plain markdown).
3. **Parse**: Line-by-line markdown processing with heading hierarchy, page-route tracking, link extraction, Reddit wiki → `fmhy.net` redirect normalization, generated category URL normalization, URL deduplication, category notes, related links, starred/index/redirect flags, and text cleaning.
4. **Cache**: Store `FmhyIndex` with schema version to `Raycast.Cache` with validation guards. Version 4 uses key `fmhy-index-v4`, returns `{ results, categories }`, and can migrate legacy v3 result arrays into a v4-compatible index marked `isLegacy`.
5. **Search**: Token-based matching (all tokens must match; case-insensitive substrings) across title, URL, hostname, category, category URL, description, flags, and related links.
6. **Display**: Group results by category, show index status and refresh shortcut in-list, render starred/index/redirect affordances, expose refresh/category/category-note actions, keep social/dev related links in the action menu, and push non-social related links into a dedicated list view.

## Key Patterns

- **React best practices**: `useCallback`, `useMemo`, cleanup flags (`isMounted`) to prevent memory leaks.
- **Type safety**: Type guards validate cache integrity before use.
- **Error resilience**: Fallback to stale cache on fetch failure if available; show warning toast.
- **Deduplication**: Map by normalized URL (hostname + pathname + search + hash, case-insensitive).
- **Text cleaning**: Multi-layer cleanup (HTML entities → control chars → markdown → emojis → whitespace).
- **FMHY URLs**: Keep FMHY page-route aliases and generated category route normalization in `src/lib/fmhy-url.ts`; avoid duplicating route maps in UI code.
- **Related resources**: Lines like "Report Issues" or "\* Tools" that have no primary URL attach their links to the previous primary result in the same category.
- **Quick links vs. related links**: X/Twitter, Discord, GitHub, GitLab, Telegram, and Reddit links stay directly available in the action menu with brand icons. Other related links show as a count accessory and open through a pushed `RelatedLinksList`.
- **Redirects**: Reddit wiki links from redirect rows should open the equivalent `https://fmhy.net/<page>#<anchor>` URL, with current FMHY route aliases applied.
- **Category metadata**: Preserve category URLs and note lines so the UI can open categories and show notes in a pushed `Detail` view with metadata/actions.
- **Pagination selection**: The manual "Load More Results" item should briefly select the first newly loaded result after loading more, then clear the controlled selection target so normal list navigation remains native and does not recenter on every arrow-key move.

## Common Development Tasks

| Task                | File                  | Key Functions                                                                                                                  |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Add UI features     | `src/search-fmhy.tsx` | `Command()`, `ResultActions()`, `RelatedLinksList()`, `CategoryNoteDetail()`, `IndexStatusSection()`, `getResultAccessories()` |
| Fix search behavior | `src/lib/search.ts`   | `searchFmhyResults()`, `matchesSearch()`                                                                                       |
| Improve parsing     | `src/lib/parser.ts`   | `parseFmhyMarkdown()`, link normalization, related-link helpers                                                                |
| Fix FMHY URLs       | `src/lib/fmhy-url.ts` | route aliases, wiki redirects, generated category URL normalization                                                            |
| Handle new errors   | `src/lib/errors.ts`   | `getErrorMessage()`                                                                                                            |
| Change cache logic  | `src/lib/cache.ts`    | Cache key/version, validation, legacy migration, `isCachedIndexFresh()`                                                        |
| Change data shape   | `src/lib/types.ts`    | `FmhyIndex`, `FmhyCategory`, `FmhyResult`, `FmhyRelatedLink`                                                                   |
| Format display      | `src/lib/format.ts`   | `formatResultCount()`, `formatTimestamp()`                                                                                     |

## Search Limitations

- Substring matching only: "react" matches "reactjs", but fuzzy typos are not handled.
- AND-only logic: Can't search for alternatives (no OR/fuzzy).
- No relevance scoring: All matches equally weighted.

## Local Commands

- `npm install`: Install dependencies for the current operating system checkout.
- `npm run dev`: Start Raycast development mode through `scripts/develop.cjs`.
- `npm run lint`: Validate the Raycast manifest and lint source files.
- `npm run build`: Build to the local ignored `dist/` directory.
- `npm run check`: Run lint and build.

## Platform-Specific Notes

- **Windows**: Always use `npm run dev`, not `ray develop` directly. The wrapper in `scripts/develop.cjs` preloads `scripts/raycast-windows-protocol.cjs` so Raycast CLI dev notifications use the registered `raycast://` protocol instead of opening an unhandled `raycast-x://` link.
- **Windows dev storage**: Do not force Raycast's local dev storage from `raycast-x` to `raycast` or `raycast-release`. Raycast Windows reads dev extension bundles from `%USERPROFILE%\.config\raycast-x\extensions\<extension-name>`. The protocol patch must only rewrite the notification URL scheme, not the storage flavor.
- **Windows stale command registry**: If Raycast keeps showing an old command after `npm run dev`, verify the compiled bundle under `%USERPROFILE%\.config\raycast-x\extensions\fmhy-search` first. Back up before touching Raycast state. A targeted reset can rename `%LOCALAPPDATA%\Raycast\extensions\fmhy-search`, `%LOCALAPPDATA%\Raycast\index`, and `%LOCALAPPDATA%\Raycast\node_extensions.db*`; never delete them without a backup.
- **Node modules not portable**: WSL and Windows must maintain separate `node_modules`.
- Raycast Storage API is platform-specific; never assume cache layout across builds.

## WSL and Windows Workflow

Use GitHub as the sync point between WSL and Windows. Develop in WSL, commit and push from WSL, then pull on the Windows checkout and run `npm run dev` from PowerShell. Do not copy or reuse `node_modules` between operating systems. See [Windows Development Workflow](docs/windows-development-workflow.md) for detailed setup.

## Editing Rules

Keep source changes scoped to the command or helper being changed. Do not commit generated output from `dist/`, dependency folders, local caches, or environment files. See [Maintenance](docs/maintenance.md) for validation and repository hygiene.
