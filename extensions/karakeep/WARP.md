# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

- Install deps: `npm ci` (or `npm install`)
- Develop (Raycast live dev): `npm run dev`
- Lint: `npm run lint`
- Auto-fix lint: `npm run fix-lint`
- Build extension bundle (outputs to `dist/`): `npm run build`
- Publish to Raycast Store: `npm run publish`

Notes
- Requires the Raycast app and Raycast CLI (`ray`) on PATH.
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
  - `src/bookmarks.tsx` — main bookmark browser. Fetches paginated bookmarks via `useGetAllBookmarks`, applies frecency ordering with `useFrecencySorting`, renders `BookmarkList`.
  - `src/lists.tsx` — lists browser (hierarchical). Uses `useGetAllLists` and `useGetListsBookmarks`; includes special “Favorites” and “Archived” subviews and list deletion actions.
  - `src/tags.tsx` — tags index. Uses `useGetAllTags` and, per tag, `useGetTagsBookmarks`; supports tag deletion.
  - `src/createBookmark.tsx` — create a link bookmark. Optional list assignment; can prefill URL from the active browser using the Raycast Browser Extension or AppleScript fallback.
  - `src/createNote.tsx` — create a text note. Has a 2500‑char limit, cached draft, and pushes a `BookmarkDetail` view on success.

- UI components
  - `src/components/BookmarkList.tsx` — reusable list surface. Accepts bookmarks, Raycast `pagination`, and callbacks. Handles local search (client‑side ranking) via `useBookmarkFilter`, and can push a network “online search” view using `useSearchBookmarks`.
  - `src/components/BookmarkItem.tsx` — one bookmark row with actions (open/copy/summarize/favorite/archive/edit/delete). Loads preview imagery via `getScreenshot` and renders structured metadata (status, tags, dates, etc.).
  - `src/components/BookmarkDetail.tsx` — detailed markdown view with preview image/asset and an action panel mirroring item actions.

- Data layer and types
  - `src/apis/index.ts` — thin HTTP client around Karakeep endpoints. `fetchWithAuth` composes URLs relative to `apiUrl` and injects the Bearer token from preferences, returning parsed JSON (or raw text). Exposes helpers for bookmarks (CRUD + search + summarize), lists, and tags. Uses both REST (`/api/v1/...`) and tRPC (`/api/trpc/...`).
  - `src/types/index.ts` — strict types for preferences, bookmarks, lists, tags, and API responses.

- Hooks
  - `useGetAllBookmarks`, `useGetListsBookmarks`, `useGetTagsBookmarks` — fetch functions wrapped with `@raycast/utils` `useCachedPromise` to enable native Raycast pagination (the hook returns `{ data, hasMore, cursor }` for `List`’s `pagination`).
  - `useSearchBookmarks` — network search via tRPC; returns `{ bookmarks, hasMore }` for ad‑hoc queries.
  - `useConfig` — materializes a typed `Config` object from preferences with sensible defaults; expose `reloadConfig` and key access.
  - `useBookmarkFilter` — client‑side weighted ranking for local search results.
  - `useTranslation` — i18n (English/Chinese), parameter interpolation, and function‑valued strings; the active language comes from preferences/config.
  - `useBrowserLink` — attempts Raycast Browser Extension first; falls back to AppleScript per‑browser to get the active tab URL.

- Utilities and constants
  - `src/utils/config.ts` — minimal `getApiConfig()` for API calls that only need `apiUrl`/`apiKey`.
  - `src/utils/screenshot.ts` — builds an authenticated preview URL via Next.js image route and pre‑primes auth with a background fetch (to let Raycast display the image).
  - `src/utils/url.ts` — URL validation.
  - `src/constants/index.ts` — color constants and default screenshot filename.

- i18n
  - `src/i18n/index.ts` — translation catalogs (en, zh). Strings are consumed through `useTranslation()`; some entries are functions to format counts/search terms.

## Data flow in brief

Preferences → `useConfig`/`getApiConfig` → `apis/*` (auth’d fetch) → hooks (`useCachedPromise`/`usePromise`) → components (`BookmarkList`/`Item`/`Detail`).
Raycast List pagination is wired directly via the `pagination` object returned from hooks. Frecency (`useFrecencySorting`) persists visit signals for better default ordering in `bookmarks.tsx`.

## Linting/TypeScript

- ESLint config: `eslint.config.mjs` extends `@raycast/eslint-config`.
- TS config: `tsconfig.json` targets ES2022, JSX `react-jsx`, strict mode enabled.
