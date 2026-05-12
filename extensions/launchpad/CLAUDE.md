# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Raycast extension replacing macOS Launchpad (removed in macOS 26 Tahoe). It displays installed apps in a Grid with user-defined folders, launched via the Raycast keyword `launchpad`.

## Documentation

Always use Context7 when needing library/API documentation, code generation, setup or configuration steps — no explicit prompt required.

## Commands

```bash
npm run dev      # develop with hot-reload inside Raycast
npm run build    # compile and validate (no watch)
npm run lint     # lint with @raycast/eslint-config
npm run fix-lint # lint + auto-fix
```

`npm run dev` requires Raycast to be running. It imports the extension into Raycast and enables hot-reload. Errors surface in Raycast's developer overlay.

## Source Layout

```
src/
  launchpad.tsx        Top-level Grid (folders + uncategorized + hidden row)
  FolderGrid.tsx       Drill-down Grid pushed when a folder is opened
  storage.ts           LocalStorage I/O + first-run import from macOS Launchpad DB
  folderIcon.ts        Composite 3×3 PNG builder (sync + async variants)
  localizedNames.ts    Resolves system-localized app names via mdls
  types.ts             LaunchpadConfig / Folder / AppEntry
```

`MoveToFolderAction` and `MoveSelectedToFolderAction` are exported from `launchpad.tsx` and reused by `FolderGrid.tsx`.

## Data Model (`src/types.ts`)

```ts
LaunchpadConfig {
  folders: Folder[]         // ordered; user-defined
  uncategorized: AppEntry[] // apps not in any folder; new installs land at the start
  hidden: AppEntry[]        // full entries so unhide can restore name/path
}

Folder    { id: string; name: string; apps: AppEntry[] }
AppEntry  { bundleId: string; name: string; path: string }
```

`bundleId` is the primary key. `path` and `name` are re-resolved from `getApplications()` + `mdls` on every sync, so renames and reinstalls heal automatically. `id` for folders is a `crypto.randomUUID()`.

## Two-Phase Load (`src/storage.ts`)

Designed so the user sees their folders within ~10 ms of opening the extension.

1. **Phase 1 — instant paint.** `loadCachedConfig()` reads the JSON blob from `LocalStorage` and returns it. No subprocess work. Returns `null` only on the very first launch.
2. **Phase 2 — background sync.** `syncWithSystem(config)` calls `getApplications()` + `mdls` to refresh names/paths and detect newly-installed or removed apps. New apps are prepended to `uncategorized`. Removed apps are filtered out of `folders` and `uncategorized` — but **never** out of `hidden` (system apps `getApplications()` doesn't return would otherwise vanish).
3. **First-ever launch — `firstRunLoadConfig()`.** No cache exists, so it imports the system Launchpad DB.

## Launchpad DB Import (`storage.ts:findLaunchpadDb` / `queryLaunchpadDb`)

The DB lives in a per-user temp dir, **not** in `~/Library/Application Support/Dock/`. Path:

```
/private${getconf DARWIN_USER_DIR}com.apple.dock.launchpad/db/db
```

Schema (macOS 15+):

```
items   (rowid, uuid, flags, type, parent_id, ordering)
          type 2 = folder, type 3 = page-inside-folder, type 4 = app
apps    (item_id, title, bundleid, ...)
groups  (item_id, category_id, title)         -- folders; no items_within_groups table
```

Hierarchy: `app → page (type 3) → folder (type 2)`. The query joins `items` twice to walk two levels up to the folder title. System groups (`Root`, `HoldingPage`, `Default`, `""`) are filtered out so only user folders survive. If the DB is missing, schema-incompatible, or `sqlite3` shells out non-zero, the import silently falls back to a flat uncategorized list.

## Folder Icon (`src/folderIcon.ts`)

Each folder cell shows a composite of up to 9 app icons in a 3×3 grid (`CELL=64px`, `GAP=2px`, fully transparent canvas so the Raycast cell background shows through gaps). Built on demand and cached on disk.

- **Cache key:** `md5(CACHE_VERSION + folderId + top9Paths.join("|"))` — positional, so reordering the top 9 invalidates.
- **Cache location:** `os.tmpdir()/raycast-launchpad-icons/<hash>.png`. Survives across launches but is wiped by macOS on reboot or extended idle. Bump `CACHE_VERSION` to invalidate everything.
- **Two builders:**
  - `buildFolderIcon` (async, `Promise.all` over sips/plutil) — used for the first-paint cold cache so 10 folders build in parallel.
  - `buildFolderIconSync` — used in the user-mutation path so an icon never lags behind a config change.
- **Sync lookup:** `getCachedFolderIcon` is a cheap `existsSync` check used by render paths.

## Synchronous Update Discipline

User mutations (move, hide, delete, rename, reorder, multi-move, …) must feel instant — no async re-renders. The discipline:

- All `LaunchpadConfig` mutations flow through `update(next)` in `launchpad.tsx`. It calls `setConfig`, `saveConfig`, then `setFolderIcons(computeFolderIconsSync(next.folders))` in the same event tick.
- `computeFolderIconsSync` rebuilds the **whole** `folderIcons` map (REPLACE, not merge). Folders that just lost their last app drop out of the map and the next render falls back to `Icon.Folder`.
- `FolderGrid` mutates its local `useState<LaunchpadConfig>` for instant in-view feedback (pushed Raycast children don't re-render when the parent's state changes), then calls `onConfigChange = update` so the parent persists + rebuilds icons.
- The icon `useEffect` in `launchpad.tsx` does the same sync REPLACE on every config change. It additionally kicks off async parallel builds, but **only on first paint** (gated by `initialIconBuildDone` ref) — so cold caches fill in quickly without flickering during user edits.

When `syncWithSystem` empties a folder (e.g., the only app in it was uninstalled), the REPLACE behavior drops the stale composite icon and the cell renders `Icon.Folder` on the next frame.

## Modes (`Mode = "app" | "multi"`)

Toggled via the Grid `searchBarAccessory` dropdown.

- **Apps** — single-app actions (Open, Move to Folder, Move App Left/Right, Hide).
- **Multi-Move** — selection is scoped to one bucket (uncategorized **or** one folder); switching scope clears the selection. Actions: Select / Deselect, Done, Select All, Deselect All, Move N to Folder, Move N to Top Level (folder view only), Move N to New Folder.

Selection state lives in two places:
- `selected: Set<string>` in `launchpad.tsx` — uncategorized scope.
- `selected: Set<string>` in `FolderGrid.tsx` — per-folder scope (resets when navigating into another folder, since each `FolderGrid` is a fresh push).

## Localized Names (`src/localizedNames.ts`)

`getApplications()` returns English bundle names. macOS displays apps under `kMDItemDisplayName` which is locale-aware (e.g. "密码" instead of "Passwords" on zh-Hans). `resolveLocalizedNames(paths)` does a single batched `mdls -name kMDItemDisplayName ...` call and returns a `Map<path, displayName>`. Falls back to bundle name on parse failure.

## Key Constraints (Raycast Platform)

- **Grid columns** are fixed at 8 (Raycast's `Grid` supports 1–8).
- **No drag-and-drop.** Reordering uses Action Panel submenus and `opt+shift+arrow` shortcuts.
- **No programmatic scroll.** Raycast exposes only `selectedItemId` (minimum-scroll-to-visible) and `clearSearchBar({forceScrollToTop:true})`.
- **No native search** is implemented in code — Raycast's search bar filters Grid items by `title` automatically.
- **Reserved shortcuts** to avoid: `cmd+a`, `cmd+up/down`, bare arrows, `cmd+enter` on the second action (Raycast auto-assigns it). The codebase uses `opt+shift+arrows` for reorder, `cmd+n` for new folder, `cmd+r` for rename, `ctrl+x` for delete folder.
- **`crypto.randomUUID()` requires explicit `import crypto from "crypto"`** in Raycast bundles — the global isn't polyfilled.

## Hidden Apps

Stored as full `AppEntry` (not just bundleId) so unhide doesn't need a re-scan. There is no per-app unhide UI — only "Unhide All", which prepends every hidden entry back into `uncategorized`. The hidden row in the top-level grid is rendered only when `config.hidden.length > 0`.
