# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with hot reload (connects to Raycast)
npm run build      # Production build (outputs to dist/)
npm run lint       # Validate package.json, icons, ESLint, and Prettier
npm run fix-lint   # Auto-fix lint and Prettier issues
npm run publish    # Submit to Raycast Store
```

Asset changes (icons, images) are not picked up by the dev server's hot reload — restart `npm run dev` for those to take effect in Raycast.

## Architecture

### Pagination pattern

All three grid views (search, top, collections) use the same manual pagination pattern with refs — **not** `useCachedPromise`'s built-in pagination:

```ts
const allWallpapers = useRef<Wallpaper[]>([]);
const currentPage = useRef(1);
const hasMore = useRef(true);

const { isLoading, revalidate } = useCachedPromise(
  async (...deps, page) => {
    const result = await searchWallpapers({ page, ... });
    hasMore.current = result.meta.current_page < result.meta.last_page;
    allWallpapers.current = page === 1 ? result.data : [...allWallpapers.current, ...result.data];
    return allWallpapers.current;
  },
  [...deps, currentPage.current],  // page in deps triggers revalidate
);

const onLoadMore = useCallback(() => {
  if (hasMore.current && !isLoading) {
    currentPage.current += 1;
    revalidate();
  }
}, [isLoading, revalidate]);
```

`hasMore.current` must be passed to `WallpaperGrid` — it's forwarded directly to Raycast's `Grid` pagination prop. Hardcoding `hasMore: true` causes infinite scroll past the last page.

### Filter reset pattern

When any filter (search text, category, purity, sorting) changes, the accumulated wallpaper list and page counter must be reset before revalidating:

```ts
allWallpapers.current = [];
currentPage.current = 1;
hasMore.current = true;
seedRef.current = undefined; // only in search, for random sorting
```

In `search-wallpapers.tsx` this is handled by `resetAndRevalidate()` which wraps any state setter.

### Random sorting seed

When `sorting=random`, the API returns a `seed` in `meta`. That seed must be passed back on subsequent page fetches to avoid duplicate results. `search-wallpapers.tsx` stores it in `seedRef`.

### Wallpaper set via AppleScript

`utils.ts:setDesktopWallpaper(path, allDesktops)` — `allDesktops=true` targets `every desktop`, `allDesktops=false` targets `current desktop` only. The image must be downloaded to a local path first (temp file via `getTempFilePath`, which uses `environment.supportPath`).

`setDesktopWallpaper` must escape backslashes and double quotes in `imagePath` before interpolating into AppleScript strings. Do not pass raw paths directly into AppleScript interpolation.

### Collections require username

The Wallhaven API endpoint for collection wallpapers is `/collections/<USERNAME>/<ID>`. The API has no endpoint that returns the authenticated user's username, so it is collected as a separate `username` preference. `My Collections` shows an empty-state gate if either `apiKey` or `username` is missing.

### Component tree

```
WallpaperGrid          — shared Grid with pagination, renders items
  └─ WallpaperActions  — ActionPanel on every grid item
       ├─ WallpaperPreview   (Action.Push) — Detail view with metadata sidebar
       └─ SimilarWallpapers  (Action.Push) — Grid using q=like:<id>
```

`WallpaperActions` imports both `WallpaperPreview` and `SimilarWallpapers` — avoid circular imports by never importing `WallpaperActions` from either of those two files.

### SFW Only preference

The `sfwOnly` boolean preference (`Safe Search` in the UI) forces purity to `"100"` in all API calls regardless of API key or user filter selection:

- `search-wallpapers`: passes `purity: "100"` and hides the Purity section from the filter dropdown entirely
- `top-wallpapers`: passes `purity: "100"` (overrides account-level default which may allow NSFW when an API key is set)
- `random-wallpaper`: passes `purity: "100"` (same reason)

When `sfwOnly` is false (default), purity is controlled by the in-UI filter in search, and left unset (account default) in top/random.

## API constraints

- Base URL: `https://wallhaven.cc/api/v1/`
- Rate limit: 45 req/min (HTTP 429 on breach)
- Auth via `X-API-Key` header — required for NSFW and collections
- Search results: 24 per page, fixed
- Categories bitmask: `"111"` = General+Anime+People (3-digit binary string)
- Purity bitmask: `"100"` = SFW only, `"110"` = SFW+Sketchy, `"111"` = all (NSFW requires API key)
- `topRange` param is only applied when `sorting=toplist`
- Search results do **not** include `uploader` or `tags` — those are only on `/w/<id>`
