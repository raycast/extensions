# Phase 2b: Search Shortcuts Command

## Context

Phase 1 (Quick Open) is complete and working. The Phase 2a backend (API token system + `GET /api/shortcuts` endpoint with Bearer auth) has been deployed to quicklinker-web. This plan implements Phase 2b — a Raycast List command that fetches all shortcuts via the API and lets users search, open, and copy them.

No changes to Phase 1 code (`src/quick-open.ts`) are needed.

## Key Design Decisions

1. **Manual LocalStorage caching** (not `useCachedPromise`) — the plan requires a 5-min TTL where fresh cache skips the network request entirely. `useCachedPromise` always revalidates on mount, which wastes rate limit budget (30 req/60s).

2. **`apiToken` is `required: false`** — making it optional prevents Raycast from prompting quick-open-only users for an API token they don't have. The search-shortcuts command shows an EmptyView with setup instructions if the token is missing.

3. **Add `@raycast/utils`** as a dependency — used for `getFavicon()` to show website favicons next to each shortcut in the list.

## Files to Modify

### `package.json`

- Add `search-shortcuts` command (mode `view`, keywords `["ql", "quicklinker", "shortcut", "link", "search"]`)
- Add `apiToken` preference (type `password`, `required: false`, description mentions Dashboard > Settings > Advanced > Enable API Access)
- Add `@raycast/utils` to dependencies

## Files to Create

### `src/lib/types.ts` — Shared types and constants

- `Shortcut` interface: `{ shortcut: string; url: string; title?: string }`
- `ShortcutsApiResponse`: `{ shortcuts: Shortcut[] }`
- `CachedShortcuts`: `{ shortcuts: Shortcut[]; fetchedAt: number }`
- `CacheState` discriminated union: `"fresh" | "stale" | "miss"`
- Constants: `API_BASE_URL`, `API_TOKEN_REGEX`, `CACHE_KEY`, `CACHE_TTL_MS` (5 min)

### `src/lib/api.ts` — Fetch wrapper

- `ApiError` class with `statusCode` and optional `retryAfterSeconds`
- `fetchShortcuts(apiToken)` — validates token format, calls `GET /api/shortcuts` with `Authorization: Bearer` header
- Parses error bodies for user-friendly messages
- Extracts `Retry-After` header on 429 responses

### `src/lib/cache.ts` — LocalStorage caching (5-min TTL)

- `getCacheState()` → returns `CacheState` (`fresh`/`stale`/`miss`)
- `setCache(shortcuts)` — stores shortcuts + timestamp
- `clearCache()` — used by manual Refresh (Cmd+R)
- Handles corrupted cache entries gracefully (cleans up + treats as miss)

### `src/search-shortcuts.tsx` — List command

**Stale-while-revalidate flow:**
- Fresh cache → show immediately, no fetch
- Stale cache → show immediately, background refresh
- Cache miss → loading spinner, fetch from API
- API failure + stale cache → keep showing stale data + warning toast

**UI:**
- `<List>` with built-in fuzzy filtering (`searchBarPlaceholder="Search shortcuts..."`)
- Each `List.Item` shows: favicon icon, title (or shortcut name), subtitle, hostname as accessory
- `keywords` on each item include shortcut name, URL, and title for broad matching

**Actions:**
- Primary: `Action.OpenInBrowser` (opens URL directly)
- Copy URL (`Cmd+Shift+C`)
- Copy Shortcut Name (`Cmd+Shift+N`)
- Refresh (`Cmd+R`) — clears cache, fetches fresh

**Empty states:**
- Missing/invalid API token → `EmptyView` with setup instructions + actions to open preferences and dashboard
- No shortcuts → `EmptyView` guiding user to add shortcuts in dashboard

**Error handling by status code:**
| Status | Behavior |
|--------|----------|
| 401 | Toast with "Open Preferences" + "Open Dashboard" actions |
| 404 | EmptyView "No shortcuts found" |
| 429 | Toast "Rate limited. Try again in Xs." (uses Retry-After header) |
| 500 | Toast "Server error. Try again later." |
| Network error | Toast with error message; stale cache continues showing |

## Verification

1. `pnpm install` — `@raycast/utils` installs cleanly
2. `pnpm run dev` — both commands appear in Raycast
3. Open "Search Shortcuts" with no API token → EmptyView with setup instructions
4. Set API token in preferences → list loads with shortcuts
5. Search/filter → fuzzy matching works
6. Select shortcut → URL opens in browser
7. Cmd+R → refresh fetches fresh data
8. Open command again within 5 min → instant load from cache (no network)
9. Wait >5 min → stale data shown instantly, background refresh updates list
10. `pnpm run lint` — no lint errors
