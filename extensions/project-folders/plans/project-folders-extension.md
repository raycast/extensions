# Raycast Project Folders - Plan

## Goal

A Raycast extension that lets Hugo fly through creative project folders. From a single fuzzy-search list, jump into Finder, open the project's Asana task / Google Drive folder / Frame.io review link, or open Magic Link Machine to manage missing links.

## Source of truth

- Root: `/Users/hugo/Sync/Gdrive/Projects/` (configurable via preference; was `…/2026/` in v0 sketch).
- Direct subdirectories of root matching `^\d{4}$` are treated as **year folders**.
- Inside each year folder, **every direct subdirectory** is treated as a project (no naming filter).
- Each project folder *may* contain up to three sibling HTML shortcut files:
  - `Asana.html`
  - `Google_Drive.html`
  - `Frame_IO.html`
- Each HTML file contains `window.location.href = "https://…"` — parse with regex `window\.location\.href\s*=\s*["']([^"']+)["']`.
- From `Asana.html`, also extract the task gid via `/task/(\d+)` — used to build Magic Link Machine URLs.

## Commands

### `search-projects` (view mode)

Single command. No additional no-view or background commands in v1.

#### List structure

- `<List.Section title="Pinned">` — projects pinned via `⌘P`, in pin order (most recently pinned first).
- `<List.Section title="2026">` — projects under `Projects/2026/`, sorted by **mtime descending**.
- `<List.Section title="2025">` — same, etc.
- Year sections rendered newest-year first.

#### Item shape

- **Title:** raw folder name (e.g. `0429_GBL_PMM_WALLET_Popup_16`).
- **Icon:** Finder folder icon.
- **Keywords (for fuzzy search):** space-separated name, year, decoded month name from MMDD prefix (e.g. `0429_…` → `"April"`), and the Asana gid if known.
- **Accessories (in order):**
  - Color tag per known link: orange `Asana`, yellow `Drive`, purple `Frame`.
  - Greyed/secondary tag per missing link: `No Asana`, `No Drive`, `No Frame`.
  - Date accessory `MM/DD` parsed from prefix (if folder name matches `^\d{4}_`).

#### Actions

1. **Open in Finder** (`⏎`) — default.
2. **Open Asana** (`⌘A`) — only if Asana link exists. Uses `asanaApp` preference (defaults to system default browser).
3. **Open Google Drive** (`⌘D`) — only if Drive link exists. Uses `linkApp` preference.
4. **Open Frame.io** (`⌘F`) — only if Frame link exists. Uses `linkApp` preference.
5. **Open Magic Link Machine** (`⌘M`) — only if gid is known. Opens `https://magicmachine.link/task/{gid}` via `linkApp`.
6. **Toggle Detail** (`⌘Y`) — flips `isShowingDetail`.
7. **Pin / Unpin Project** (`⌘P`) — persisted in LocalStorage.
8. **Refresh** (`⌘R`) — wipes cache for this project (or all, on a modifier) and re-parses.
9. **Copy Folder Path** (`⌘⇧.`).
10. **Copy Project Name** (`⌘⇧,`).

#### Detail panel

Markdown body with:

- Project name
- Absolute path
- MMDD date (if present)
- mtime (formatted)
- Asana / Drive / Frame URLs (as markdown links, only those present)
- Top-level subfolder list (e.g. `00_Exports`, `01_AE`, `01_PP`, …)

Subfolder list is read lazily — only `readdir` when detail panel is shown for the focused item.

## Preferences

- `projectsRoot` (`directory`, default `/Users/hugo/Sync/Gdrive/Projects`) — root containing year folders.
- `linkApp` (`appPicker`, optional) — application used for Drive, Frame.io, and Magic Link Machine URLs. Empty = system default browser.
- `asanaApp` (`appPicker`, optional) — application used for Asana URLs. Empty = system default browser. User can point at `Asana.app` which natively handles `app.asana.com` URLs.

## Caching

In-session: `useCachedPromise(listProjects)` and per-item `useCachedPromise(readAllLinks)`.

Persistent (Raycast `LocalStorage`):

```ts
type CachedProject = {
  asana?: { url: string; mtime: number };
  drive?: { url: string; mtime: number };
  frameio?: { url: string; mtime: number };
  gid?: string; // extracted from asana.url via /task/(\d+)
};
type Cache = Record<string /* absolute project path */, CachedProject>;
```

Invalidation: per HTML file, by mtime. On each load:

1. `stat` each of the 3 HTML files.
2. If a file's mtime matches the cached entry, reuse cached URL.
3. Otherwise, read + parse the HTML and update the cache entry.
4. If a file no longer exists, drop the entry for that service.

`⌘R Refresh` clears the cache entry for the focused project and re-parses.

Pinned projects also persist in LocalStorage under a separate key (`pinned: string[]` of absolute paths). On load, stale pins (paths that no longer exist) are silently pruned.

## Empty & error states

- Projects root unreadable / does not exist → `<List.EmptyView>` titled "Projects root not found", subtitle shows the configured path, with an `Action.OpenExtensionPreferences`.
- Root exists but contains zero `\d{4}` year subfolders → `<List.EmptyView>` "No year folders found", subtitle "Expected `YYYY/` subfolders under {root}", with `Action.OpenExtensionPreferences`.
- HTML parse failure (file present but no URL extracted) → silently treat as no link. No toast.
- Unhandled exception while scanning → failure toast via `showToast({ style: Failure, … })`.

## Non-goals (v1)

- Creating or editing the HTML shortcut files — that's Magic Link Machine's job.
- Creating new project folders — that's the folder generator.
- Cross-year activity heatmaps, archived/completed flagging, time tracking.
- Grid layout, custom thumbnails, project preview images.
- "Open in Terminal" / "Open in Editor" actions.
- Multiple commands (`no-view` quick-open, current-Finder-project actions, etc.).
- Browser-profile-aware opening (Chrome `--profile-directory`).
- Acronym expansion in search (PMM, UED, GBL, …).

## Tech

- `@raycast/api`, `@raycast/utils`
- TypeScript, no extra runtime deps
- pnpm@9, Raycast standard layout (`.eslintrc.json` w/ `@raycast/eslint-config`, `.prettierrc`, `CHANGELOG.md`, `assets/`, `metadata/`)
- Node `fs/promises` for IO; single regex for URL extraction

## File layout

```
src/
  search-projects.tsx     # the command (List + ProjectItem + DetailMarkdown)
  projects.ts             # listProjects, parseDatePrefix, monthName helpers
  links.ts                # readLink, readAllLinks, extractGid, URL regex
  cache.ts                # LocalStorage shape, get/set, mtime check, pin helpers
package.json
tsconfig.json
.eslintrc.json
.prettierrc
.npmrc
CHANGELOG.md
README.md
AGENTS.md
plans/project-folders-extension.md
```
