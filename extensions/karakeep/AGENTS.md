# Project: karakeep

This file provides guidance to AI agents when working with code in this repository.

## Commands

- Install deps: `npm ci` (or `npm install`)
- Develop (Raycast live dev): `npm run dev`
- Lint: `npm run lint`
- Auto-fix lint: `npm run fix-lint`
- Build extension bundle (outputs to `dist/`): `npm run build`
- Publish to Raycast Store: `npm run publish`

Notes

- Requires the Raycast app and Raycast CLI (`ray`) on PATH.
- `quickBookmark` command uses `mode: "no-view"` for instant bookmark creation without UI.
- There is no test harness configured; running “a single test” is not applicable.

## Configuration (Raycast Preferences -> Karakeep)

The extension reads required credentials and UI options from Raycast preferences (see `package.json > preferences`). Minimum to run:

- `apiUrl` (e.g., `https://your-karakeep.host.com`)
- `apiKey`

Optional behavior toggles used at runtime:

- `language` (`en` | `zh`), `showWebsitePreview`, `linkMainAction`, `textMainAction`, `createBookmarkType`, `prefillUrlFromBrowser`, plus display flags like `displayBookmarkPreview`, `displayTags`, etc.

## High-level architecture

Raycast extension written in TypeScript + React (TSX). Core areas:

- Commands (entrypoints)
  - `src/bookmarks.tsx` — main bookmark browser. Fetches paginated bookmarks via `useGetAllBookmarks` ([`GET /api/v1/bookmarks`](https://docs.karakeep.app/api)), applies frecency ordering with `useFrecencySorting`, renders `BookmarkList`. Includes a list-filter dropdown in the search bar. [API Documentation: Bookmarks](https://docs.karakeep.app/api/#bookmarks)
  - `src/lists.tsx` — lists browser (hierarchical). Uses `useGetAllLists` ([`GET /api/v1/lists`](https://docs.karakeep.app/api)) and `useGetListsBookmarks` ([`GET /api/v1/lists/{id}/bookmarks`](https://docs.karakeep.app/api)); includes special “Favorites” and “Archived” subviews and full list CRUD ([`POST`](https://docs.karakeep.app/api/karakeep-api/create-list) / [`PATCH`](https://docs.karakeep.app/api/karakeep-api/update-list) / [`DELETE /api/v1/lists/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-list)). Smart lists support a query builder for inserting valid filter qualifiers. [API Documentation: Lists](https://docs.karakeep.app/api/#lists)
  - `src/tags.tsx` — tags index. Uses `useGetAllTags` ([`GET /api/v1/tags`](https://docs.karakeep.app/api)) and per-tag `useGetTagsBookmarks` ([`GET /api/v1/tags/{id}/bookmarks`](https://docs.karakeep.app/api)); full tag CRUD ([`POST`](https://docs.karakeep.app/api/karakeep-api/create-tag) / [`PATCH`](https://docs.karakeep.app/api/karakeep-api/update-tag) / [`DELETE /api/v1/tags/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-tag)). [API Documentation: Tags](https://docs.karakeep.app/api/#tags)
  - `src/notes.tsx` — notes view (bookmarks with `type: “text”`). Filters client-side to guard against stale cache serving link bookmarks. Empty state offers a Create Note action.
  - `src/highlights.tsx` — highlights list and detail. Full CRUD for highlights ([`GET`](https://docs.karakeep.app/api/karakeep-api/list-highlights) / [`PATCH`](https://docs.karakeep.app/api/karakeep-api/update-highlight) / [`DELETE /api/v1/highlights/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-highlight)). Each highlight has an “Open Bookmark” action that fetches and pushes `BookmarkDetail`. Note: highlight creation is not supported (requires DOM character offsets only available via the browser extension).
  - `src/stats.tsx` — user stats dashboard ([`GET /api/v1/users/me/stats`](https://docs.karakeep.app/api/karakeep-api/get-current-user-stats)). Renders counts, top domains/tags, activity, and storage in markdown + sidebar metadata. SVG charts (sources, activity by hour/day) generated via `horizontalBarChart` using `environment.appearance` for theme-aware colors.
  - `src/backups.tsx` — backups management ([`GET`](https://docs.karakeep.app/api/karakeep-api/list-backups) / [`POST`](https://docs.karakeep.app/api/create-backup) / [`DELETE /api/v1/backups/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-backup)). Polls every 5 s while any backup has `status: “pending”`; Download action only available for `status: “success”`; failure toast shown on `pending → failure` transition.
  - `src/createBookmark.tsx` — create a link bookmark ([`POST /api/v1/bookmarks`](https://docs.karakeep.app/api)). Optional list assignment and tag picker; can prefill URL from the active browser using the Raycast Browser Extension or AppleScript fallback. [API Documentation: Create Bookmark](https://docs.karakeep.app/api/#create-bookmark)
  - `src/createNote.tsx` — create a text note ([`POST /api/v1/bookmarks`](https://docs.karakeep.app/api) with `type: “text”`). Includes a tag picker.
  - `src/createList.tsx` — create a list ([`POST /api/v1/lists`](https://docs.karakeep.app/api/karakeep-api/create-list)). Supports manual and smart list types; smart lists include query validation.
  - `src/quickBookmark.tsx` — quick bookmark the current browser tab (no-view mode). Uses [`POST /api/v1/bookmarks`](https://docs.karakeep.app/api). [API Documentation: Quick Bookmark](https://docs.karakeep.app/api/#quick-bookmark)

- Offline / Docker recovery

  Cross-cutting layer that turns "the server is unreachable" into a recoverable state. Read `src/utils/connection.ts` first — everything else builds on it.

  - `src/utils/connection.ts` — the primitives. `isConnectionError()` distinguishes a transport failure from an HTTP error; an HTTP 401/500 proves the server IS up, so it must NOT be treated as a connection failure. `describeConnectionError()` produces a human message. `isApiReachable()` is the single liveness probe (any HTTP response counts). `isLocalHost()` / `getPortFromUrl()` classify the configured `apiUrl`.
  - `src/utils/docker.ts` — Docker CLI wrapper. Resolves the binary by absolute path (Raycast does not inherit the user's shell `PATH`). `startContainer()` starts the whole Compose project, not one container — Karakeep's stock deployment is `web` + `meilisearch` + `chrome`, and starting only `web` yields an instance that answers HTTP but cannot search or crawl.
  - `src/utils/submitGuard.ts` — `ensureReachable()`, the shared start → wait → toast flow used before any write, and `canRecoverLocally()`, which answers "would offering a Start action accomplish anything".
  - `src/utils/guard.ts` — `shouldGuard(error, hasLiveData)`: whether a view should render the recovery screen.
  - `src/utils/fetchError.ts` — `handleFetchError(scope)`, passed as `onError` to every data hook.
  - `src/hooks/useApiReachable.ts` — pre-flight reachability for create FORMS; also owns `start()` and `canStart`.
  - `src/hooks/useConnectionRecovery.ts` — Docker probe for VIEW commands; delegates the actual recovery to `ensureReachable`.
  - `src/hooks/useLiveData.ts` / `src/hooks/useCanRecoverLocally.ts` — see the invariants below.
  - `src/components/ConnectionErrorView.tsx` — recovery screen for `List` views. `src/components/OfflineFormNotice.tsx` — inline notice + Start action for forms.

  **Invariants that are easy to break:**

  1. **Never gate the recovery screen on `data.length`.** `useCachedPromise` persists its last value to disk between command runs, so on a cold start against a dead server the rows come straight off the cache and a non-empty list proves nothing. Use `hasLiveData` from `useLiveData`, which latches only when a request actually SUCCEEDS this session.
  2. **`useLiveData` needs a `resetKey` wherever one component instance serves multiple requests** (list/tag drill-downs). React does not remount on a prop change, so without it the latch earned by list A would claim list B's stale cache is live.
  3. **Passing `onError` suppresses Raycast's built-in toast.** `@raycast/utils` runs `if (onError) onError(e) else showFailureToast(…, "Failed to fetch latest data")`. That is deliberate — the recovery screen owns the message — but it means **any view that consumes a guarded hook MUST render the recovery screen**, or a connection failure becomes completely silent.
  4. **Gate the Start action on `canStart`, not merely on being offline.** A hosted instance has no local container to start, so the action would do nothing visible.
  5. **Log the syscall code as `errorCode`, never `code`.** `@chrismessina/raycast-logger` redacts any key named `code` as a 2FA code, masking it to `******`.

- UI components
  - `src/components/BookmarkList.tsx` — reusable list surface. Accepts bookmarks, Raycast `pagination`, and callbacks. Handles local search (client‑side ranking) via `useBookmarkFilter`, and can push a network “online search” view using `useSearchBookmarks`.
  - `src/components/BookmarkItem.tsx` — one bookmark row with actions (open/copy/summarize/favorite/archive/edit/delete). Loads preview imagery via `getScreenshot` and renders structured metadata (status, tags, dates, etc.). Includes a “Get Browser Extension” action section with links to the Chrome, Firefox, and Safari extensions.
  - `src/components/BookmarkDetail.tsx` — detailed markdown view with preview image/asset and an action panel mirroring item actions.
  - `src/components/BookmarkEdit.tsx` — edit form for bookmark title, URL, and note.

- Data layer and types
  - `src/apis/index.ts` — thin HTTP client around Karakeep endpoints. `fetchWithAuth` composes URLs relative to `apiUrl` and injects the Bearer token from preferences, returning parsed JSON (or raw text). Exposes helpers for bookmarks (CRUD + search + summarize), lists, tags, highlights ([`GET`](https://docs.karakeep.app/api/karakeep-api/list-highlights) / [`PATCH`](https://docs.karakeep.app/api/karakeep-api/update-highlight) / [`DELETE`](https://docs.karakeep.app/api/karakeep-api/delete-highlight)), backups ([`GET`](https://docs.karakeep.app/api/karakeep-api/list-backups) / [`POST`](https://docs.karakeep.app/api/create-backup) / [`DELETE`](https://docs.karakeep.app/api/karakeep-api/delete-backup) / download), and user stats ([`GET /api/v1/users/me/stats`](https://docs.karakeep.app/api/karakeep-api/get-current-user-stats)). Uses both REST ([`/api/v1/...`](https://docs.karakeep.app/api)) and tRPC ([`/api/trpc/...`](https://docs.karakeep.app/api)).
  - `src/types/index.ts` — strict types for preferences, bookmarks, lists, tags, highlights, backups, user stats, and API responses.

- Hooks
  - `useGetAllBookmarks`, `useGetListsBookmarks`, `useGetTagsBookmarks` — fetch functions wrapped with `@raycast/utils` `useCachedPromise` to enable native Raycast pagination (the hook returns `{ data, hasMore, cursor }` for `List`'s `pagination`).
  - `useSearchBookmarks` — network search via tRPC ([`bookmarks.searchBookmarks`](https://docs.karakeep.app/api)); returns `{ bookmarks, hasMore }` for ad‑hoc queries.
  - `usePrefetchPagination` — pre-fetches next pagination page for smoother scrolling.
  - `useConfig` — materializes a typed `Config` object from preferences with sensible defaults; expose `reloadConfig` and key access.
  - `useBookmarkFilter` — client‑side weighted ranking for local search results.
  - `useTranslation` — i18n (English/Chinese), parameter interpolation, and function‑valued strings; the active language comes from preferences/config.
  - `useBrowserLink` — attempts Raycast Browser Extension first; falls back to AppleScript per‑browser to get the active tab URL.

- Utilities and constants
  - `src/utils/config.ts` — minimal `getApiConfig()` for API calls that only need `apiUrl`/`apiKey`.
  - `src/utils/screenshot.ts` — fetches the preview through the Next.js image route and caches it on disk under `environment.supportPath/preview-images` (14-day sweep, atomic temp-file rename), returning a local path. Raycast cannot load an authenticated remote URL directly.
  - `src/utils/markdown.ts` — `markdownImage()` escapes local image paths (whitespace breaks bare Markdown links) and appends Raycast's `raycast-width`/`raycast-height` sizing params.
  - `src/utils/toast.ts` — `runWithToast()` helper for showing loading/success/failure toast notifications around async operations. `toErrorMessage()` unwraps a transport failure's `cause` — `error.message` alone is the useless string "fetch failed".
  - `src/utils/url.ts` — URL validation.
  - `src/utils/formatting.ts` — `formatBytes()` for human-readable file sizes.
  - `src/utils/svgChart.ts` — `horizontalBarChart()` generates a base64-encoded SVG data URI for horizontal bar charts. Accepts `appearance: "light" | "dark"` from `environment.appearance` to bake theme-aware colors at render time (CSS `prefers-color-scheme` does not work in sandboxed `<img>`-embedded SVGs).
  - `src/constants/index.ts` — color constants and default screenshot filename.

- i18n
  - `src/i18n/index.ts` — translation catalogs (en, zh). Strings are consumed through `useTranslation()`; some entries are functions to format counts/search terms.

## Data flow in brief

Preferences → `useConfig`/`getApiConfig` → `apis/*` (auth'd fetch) → hooks (`useCachedPromise`/`usePromise`) → components (`BookmarkList`/`Item`/`Detail`).
Raycast List pagination is wired directly via the `pagination` object returned from hooks. Frecency (via `useFrecencySorting` from `@raycast/utils`) persists visit signals for better default ordering in `bookmarks.tsx`.

## Linting/TypeScript

- ESLint config: `eslint.config.mjs` extends `@raycast/eslint-config`.
- TS config: `tsconfig.json` targets ES2022, JSX `react-jsx`, strict mode enabled.

## Coding Standards

- Use TypeScript.
- Use  `npm run fix-lint` command to comply with linting rules and automaticaly fix.

## Docs

- [Raycast Extensions](https://developers.raycast.com/)
- [Karakeep API](https://docs.karakeep.app/api/)
- `docs/solutions/` — documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing or debugging in documented areas.
- `CONCEPTS.md` — shared domain vocabulary (entities, named processes, status concepts). Relevant when orienting to the codebase or discussing domain concepts.
