# Raycast Extension for QuickLinker - Implementation Plan

## Context

A user requested a Raycast plugin for QuickLinker. This would let users resolve their shortcuts directly from Raycast instead of the browser address bar. The implementation is phased: Phase 1 requires no backend changes, Phase 2 adds a new API endpoint for a richer experience.

**This plan spans two repositories:**
- `quicklinker-web` (existing) — Phase 2a backend API route + dashboard UI changes
- `quicklinker-raycast` (new, separate repo) — Phase 1 + Phase 2b Raycast extension

---

## Phase 1: Quick Open Command (No backend changes)

### New project: `quicklinker-raycast` (separate repo)

**Structure:**
```
quicklinker-raycast/
  package.json          # Raycast manifest + deps
  tsconfig.json
  src/
    quick-open.tsx      # No-view command: type shortcut, opens URL
  assets/
    extension-icon.png  # 512x512, derived from QuickLinker branding
  README.md
  CHANGELOG.md
```

**How it works:**
1. User invokes "Quick Open Shortcut" in Raycast
2. Types shortcut name (e.g. "github") in inline argument field
3. Raycast calls `open(`https://quicklinker.app/s/${magicKey}?q=${shortcut}`)`
4. Browser opens, QuickLinker redirects to destination

**Key details:**
- Command mode: `no-view` (fastest — no UI rendered, just opens URL)
- Magic key stored as `password` preference (masked in UI, stored in Keychain)
- Magic key format validation: `/^ql_[0-9a-f]{32}$/`

### Store publishing (applies to both phases)
- Icon: 512x512 PNG derived from existing QuickLinker SVG assets
- Screenshots: 2560x1600 or 1280x800, showing each command in action
- License: MIT
- Categories: Productivity, Web
- README with setup instructions (how to find magic key in dashboard)

---

## Phase 2: Searchable List (Requires new API endpoint)

### 2a. Backend changes in quicklinker-web

#### 2a-i. API Token System (Dashboard + Convex + Redis)

Users must explicitly opt-in to API access via an "Enable API Access" toggle in Advanced Settings. This generates a separate API token (`qlapi_<32 hex chars>`) that is never exposed in browser URLs — unlike the magic key.

**Why separate from magic key:**
- Magic keys appear in browser URLs (address bar, history, screen shares)
- A leaked magic key currently only lets someone resolve shortcuts they can guess by name, one at a time
- The API endpoint returns ALL shortcuts in one request — much higher exposure if the magic key were reused
- The API token is only ever stored in Raycast Keychain and sent via `Authorization` header

**Schema change** (`convex/schema.ts`):
```typescript
// Add to users table:
apiToken: v.optional(v.string()),  // Format: qlapi_<32 hex chars>
```

**New Convex mutations/actions** (`convex/users.ts`):
- `enableApiAccess` — generates `qlapi_<random>` token, stores in Convex `users.apiToken`, syncs to Redis:
  - Sets `_meta:apiToken` in the user's `sc:{magicKey}` hash
  - Creates reverse lookup: `SET apitoken:{token} {magicKey}` (for API endpoint to find shortcuts without needing magic key)
- `disableApiAccess` — clears token from Convex, removes `_meta:apiToken` from hash, deletes reverse lookup key
- `rotateApiToken` — generates new token, cleans up old reverse lookup, creates new one

**Sync integration** (`convex/kv.ts`):
- `syncAllShortcuts` must include `_meta:apiToken` in the hash if `user.apiToken` exists
- Must recreate the `apitoken:{token}` reverse lookup after the pipeline del/hset

**Dashboard UI** (`src/components/dashboard/settings/AdvancedSettings.tsx`):
- New section below the magic key section, separated by `<Separator />`
- Toggle: "Enable API Access" with description "Enable API access to integrate tools like Raycast"
- When enabled: shows masked API token with show/hide, copy, and rotate buttons (same pattern as magic key)
- When disabled: just the toggle, no token displayed

#### 2a-ii. New API Route

**New file:** `src/app/api/shortcuts/route.ts`

Note: URL is `GET /api/shortcuts` (no magic key in path) — the API token in the `Authorization` header is the sole credential.

**Request:**
```
GET /api/shortcuts
Authorization: Bearer qlapi_<32 hex chars>
```

**Flow:**
1. Extract token from `Authorization: Bearer <token>` header
2. Validate format: `/^qlapi_[0-9a-f]{32}$/`
3. Rate limit: 30 req/60s per token (prefix `@upstash/ratelimit:shortcuts-api`)
4. Reverse lookup: `GET apitoken:{token}` → `magicKey`
5. Fetch shortcuts: `HGETALL sc:{magicKey}` using `kvRead`
6. Filter out `_meta:*` keys, parse shortcut values, return JSON

**Success response (200):**
```json
{
  "shortcuts": [
    { "shortcut": "github", "url": "https://github.com/myorg", "title": "GitHub" },
    { "shortcut": "docs", "url": "https://docs.example.com", "title": "Documentation" }
  ]
}
```

**Error responses:**
- `401` — Missing or invalid token format: `{ "error": "Invalid or missing API token" }`
- `401` — Token not found in reverse lookup: `{ "error": "Invalid or missing API token" }` (same message, don't leak existence)
- `404` — No shortcuts in hash: `{ "error": "No shortcuts found" }`
- `429` — Rate limited: `{ "error": "Too many requests" }` with `Retry-After` header
- `500` — Server error: `{ "error": "Internal server error" }`

**Key files to reference (in quicklinker-web):**
- `src/lib/kv.ts` — `kvRead` (read-only Redis client), `kv` (read-write, for rate limiter)
- `src/lib/contact/rateLimit.ts` — pattern for rate limiter setup + IP extraction
- `convex/kv.ts:100-157` — `syncAllShortcuts` defines the Redis hash structure
- `src/proxy.ts:143-155` — `parseShortcutValue` shows how shortcut entries are parsed

### 2b. Raycast: Search Shortcuts command

**New files in quicklinker-raycast:**
```
src/
  search-shortcuts.tsx  # List command
  lib/
    types.ts            # Shared types
    api.ts              # Fetch from /api/shortcuts
    cache.ts            # LocalStorage caching (5 min TTL)
```

**How it works:**
1. User opens "Search Shortcuts" command
2. Extension checks LocalStorage cache — shows cached shortcuts immediately if available
3. If cache is stale (>5 min), fetches fresh data from API in background
4. Raycast `<List>` provides built-in fuzzy filtering
5. Primary action: `Action.OpenInBrowser` opens URL directly (skips redirect endpoint)
6. Secondary actions: Copy URL, Copy shortcut name, Refresh (Cmd+R)
7. Accessories show hostname for visual identification

**Authentication:**
- API token stored as a separate `password` preference (masked, Keychain-backed)
- Sent as `Authorization: Bearer <token>` header on every API request
- Token format validation: `/^qlapi_[0-9a-f]{32}$/`

**Caching strategy (stale-while-revalidate):**
- Cache hit + fresh → show cached, done
- Cache hit + stale → show cached immediately, background refresh
- Cache miss → show loading spinner, fetch from API
- API failure + stale cache → continue showing stale data with warning toast

### Phase transition
Both commands coexist — Quick Open stays for speed (uses magic key + browser redirect), Search Shortcuts adds discovery (uses API token + direct URL opening). No changes to Phase 1 code needed.

---

## Security

- Magic key remains semi-public (in browser URLs) — grants single-shortcut resolution only
- API token is never in URLs — only in Raycast Keychain and `Authorization` headers
- API access is opt-in: users who don't enable it have zero additional exposure
- `password` preference type stores both keys in macOS Keychain
- API response excludes `_meta:*` fields (no userId, plan, limit, or apiToken exposed)
- Rate limiting (30 req/60s per token) prevents enumeration/scraping
- Both token formats validated with regex on client and server
- Reverse lookup (`apitoken:{token}` → `magicKey`) prevents needing magic key in API requests

---

## Verification

**Phase 1:**
- `npm run dev` in Raycast → invoke Quick Open → type shortcut → verify browser opens correct URL
- Test with invalid magic key → verify HUD error message
- Test with empty shortcut → verify HUD error message

**Phase 2a backend:**
- Enable API access in dashboard → verify token is generated and displayed
- `curl -H "Authorization: Bearer qlapi_..." https://quicklinker.app/api/shortcuts` → verify JSON response
- `curl` with no auth → verify 401
- `curl` with invalid token → verify 401
- Rapid requests → verify 429 rate limit
- Disable API access → verify token is revoked and 401 is returned

**Phase 2b Raycast:**
- Open Search Shortcuts → verify list loads with correct shortcuts
- Search/filter → verify fuzzy matching works
- Select shortcut → verify URL opens in browser
- Cmd+R → verify refresh fetches fresh data
- Kill network → verify cached shortcuts still display

---

## Appendix: Backend Context for Raycast Repo

> Everything below is extracted from `quicklinker-web` so the Raycast extension can be built in a separate repo/session without needing access to the web codebase.

### A. QuickLinker Redirect URL Pattern

The existing redirect endpoint (no API needed for Phase 1):

```
https://quicklinker.app/s/{magicKey}?q={shortcut}
```

- `magicKey`: the user's unique key, format `ql_` followed by 32 hex chars (regex: `/^ql_[0-9a-f]{32}$/`)
- `shortcut`: the shortcut name (case-insensitive, lowercased server-side)
- The server performs a 307 redirect to the destination URL
- If the shortcut doesn't exist, the server returns a 404 HTML page

### B. Phase 2 API Endpoint Contract

Once Phase 2a is deployed to `quicklinker-web`, this endpoint will be available:

```
GET https://quicklinker.app/api/shortcuts
Authorization: Bearer qlapi_<32 hex chars>
```

The API token is separate from the magic key. Users generate it in Dashboard → Settings → Advanced → "Enable API Access".

**Success response (200):**
```json
{
  "shortcuts": [
    {
      "shortcut": "github",
      "url": "https://github.com/myorg",
      "title": "GitHub"
    },
    {
      "shortcut": "docs",
      "url": "https://docs.example.com",
      "title": "Documentation"
    }
  ]
}
```

**Error responses:**
- `401` — Invalid or missing API token: `{ "error": "Invalid or missing API token" }`
- `404` — No shortcuts found: `{ "error": "No shortcuts found" }`
- `429` — Rate limited (30 req/60s per token): `{ "error": "Too many requests" }` with `Retry-After` header
- `500` — Server error: `{ "error": "Internal server error" }`

**Notes:**
- The API token (`qlapi_...`) is the sole credential — no magic key needed in the request
- Only shortcut data is returned; internal metadata is stripped
- CORS: Not needed (Raycast extensions use Node fetch, not browser fetch)

### C. Raycast Extension Preferences

The extension needs two `password` preferences:

| Preference | Label | Description | Format | Used by |
|---|---|---|---|---|
| `magicKey` | Magic Key | Your QuickLinker magic key (from Dashboard → Settings → Advanced) | `ql_<32 hex>` | Quick Open command |
| `apiToken` | API Token | Your QuickLinker API token (from Dashboard → Settings → Advanced → Enable API Access) | `qlapi_<32 hex>` | Search Shortcuts command |

### D. Redis Hash Structure (for understanding the data model)

Each user's shortcuts are stored in a single Redis hash at key `sc:{magicKey}`:

```
sc:ql_abc123...
  ├── "github"          → {"url":"https://github.com/myorg","shortcutId":"j57...","title":"GitHub"}
  ├── "docs"            → {"url":"https://docs.example.com","shortcutId":"k82...","title":"Documentation"}
  ├── "_meta:userId"    → "user_abc123"         (stripped from API response)
  ├── "_meta:plan"      → "pro"                 (stripped from API response)
  ├── "_meta:limit"     → "10000"               (stripped from API response)
  ├── "_meta:apiToken"  → "qlapi_abc123..."     (stripped from API response)
  └── "_meta:fallback"  → "https://google.com/search?q=%s"  (stripped from API response)
```

A reverse lookup key also exists when API access is enabled:
```
apitoken:qlapi_abc123...  →  "ql_abc123..."  (maps API token → magic key)
```

- Hash field names = lowercase shortcut names
- Hash values for shortcuts = JSON objects: `{ url: string, shortcutId: string, title: string }`
- Hash values for `_meta:*` = plain strings
- Fields prefixed with `_meta:` are internal and must never be exposed in API responses

### E. Shortcut Value Parsing (from proxy.ts)

The proxy parses shortcut values from Redis like this — values may be JSON objects or JSON strings:

```typescript
const parseShortcutValue = (value: unknown): { url: string; shortcutId?: string; title?: string } | null => {
  if (!value) return null;
  if (typeof value === 'object') return value as { url: string; shortcutId?: string; title?: string };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      return null;
    }
  }
  return null;
};
```

The API endpoint in Phase 2a should use this same parsing logic when reading from Redis.

### F. Rate Limiting Pattern (from rateLimit.ts)

The existing codebase uses `@upstash/ratelimit` with Upstash Redis. Pattern for the new API endpoint:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@/lib/kv';

// Rate limiter instance
const shortcutsApiRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '60 s'),
  analytics: true,
  prefix: '@upstash/ratelimit:shortcuts-api',
});

// Rate limit by API token (not IP, since token is the credential)
const identifier = token;
```
