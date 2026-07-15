# Development Patterns

> This document is kept concise and structured for quick reference — useful for both developers and AI coding assistants.

Coding patterns and conventions for the Tella Raycast extension.

---

## ⚠️ Rate Limiting (Critical)

The Tella API has rate limits. **Any batch operation that fetches individual video details must include delays between batches.** See `Features & Roadmap.md` for full context.

**Key constants** (`src/utils.ts`):
```typescript
export const FETCH_CONCURRENCY = 3;      // Max concurrent requests per batch
export const BATCH_DELAY_MS = 1000;      // Delay between batches (milliseconds)
```

**Always add delays in batch loops:**
```typescript
for (let i = 0; i < items.length; i += FETCH_CONCURRENCY) {
  // Add delay between batches (but not before the first)
  if (i > 0 && BATCH_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
  }
  
  const batch = items.slice(i, i + FETCH_CONCURRENCY);
  // ... process batch
}
```

**For rate limit errors**, use `RateLimitErrorDetail` component:
```typescript
import { RateLimitError } from "./api";
import { RateLimitErrorDetail } from "./components";

if (error instanceof RateLimitError) {
  return <RateLimitErrorDetail error={error} onRetry={handleRetry} />;
}
```

---

## File Structure

```
src/
├── api.ts           # API client with auth, rate limiting, RateLimitError
├── cache.ts         # LocalStorage caching utilities
├── components.tsx   # Shared React components (ErrorDetail, RateLimitErrorDetail)
├── types.ts         # TypeScript interfaces for API responses
├── utils.ts         # Shared utilities, constants, batchProcess, estimateBatchTime
├── browse-videos.tsx
├── browse-playlists.tsx
├── overview.tsx
├── search-transcripts.tsx
└── tools/
    └── search-transcripts.ts  # AI Chat tool for transcript search
```

---

## Error Handling

Use components from `src/components.tsx`. Ensure primary action is Enter-accessible.

**For rate limit errors** — Use `RateLimitErrorDetail`:
```typescript
import { RateLimitError } from "./api";
import { RateLimitErrorDetail } from "./components";

if (error instanceof RateLimitError) {
  return <RateLimitErrorDetail error={error} onRetry={revalidate} context={{ command: "..." }} />;
}
```

**For general errors** — Use `ErrorDetail`:
```typescript
if (error) {
  return <ErrorDetail error={error} context={{ command: "Browse Videos" }} />;
}
```

**Action-level errors** (failed delete, duplicate, etc.):
```typescript
const { push } = useNavigation();

try {
  await deleteVideo(id);
} catch (error) {
  push(<ErrorDetail error={error} context={{ action: "Delete", videoId: id }} />);
}
```

**Debug info includes:** error message, stack trace, timestamp, and any context you pass.

---

## Alerts

Use `Alert.ActionStyle.Destructive` for destructive confirmations:

```typescript
await confirmAlert({
  title: "Delete Video",
  message: `Are you sure you want to delete "${video.name}"?`,
  primaryAction: {
    title: "Delete",
    style: Alert.ActionStyle.Destructive, // ✅ Not Alert.Style.Destructive
  },
});
```

---

## Constants

Define in `src/utils.ts`:

```typescript
export const CACHE_FRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const GRID_INITIAL_LOAD = 24;                    // 6 rows × 4 columns
export const FETCH_CONCURRENCY = 3;                     // Concurrent API requests (kept low to avoid rate limiting)
export const BATCH_DELAY_MS = 1000;                     // Delay between batches to avoid rate limiting
```

**Utilities:**
- `batchProcess()` — Rate-limited batch processor with progress callbacks
- `estimateBatchTime()` — Human-readable time estimate for batch operations

---

## Caching

**Video cache** (`src/cache.ts`):
- Key: `tella-videos-cache`
- Stores full video list in LocalStorage
- Freshness configurable via `cacheDuration` preference
- Background refresh when stale

**Transcript cache** (`src/cache.ts`):
- Key: `tella-transcripts-cache`
- Stores transcripts separately (large content)
- Incremental updates (only fetches new videos)
- Size monitoring: warns at 3MB, critical at 5MB
- Use `getTranscriptCacheStats()` to check size

**User preferences** (LocalStorage):
- `viewMode` — list/grid toggle
- `sortBy` — sort preference

---

## Data Fetching

Use `useCachedPromise` from `@raycast/utils`:

```typescript
const { data, isLoading, revalidate } = useCachedPromise(
  async () => fetchData(),
  [],
  { keepPreviousData: true }
);
```

For pagination, manage cursor state manually and call `revalidate()` to trigger fetches.

---

## API Client

The API client (`src/api.ts`) handles:
- Authentication via Bearer token
- Rate limiting (429) with automatic retry + exponential backoff + jitter
- Max 3 retry attempts before throwing `RateLimitError`
- Respects `Retry-After` header when present
- All errors bubble up to UI for `ErrorDetail` or `RateLimitErrorDetail` handling

**Exported classes:**
- `RateLimitError` — Specific error for rate limit failures (has `retryAfter` property)

---

## Type Safety

- Use types from `src/types.ts`
- No `any` types
- Type guard for errors: `error instanceof Error`

---

## Raycast Specifics

- **Imports:** `@raycast/api` for UI, `@raycast/utils` for hooks
- **Icons:** Use `Icon.*` enum, not custom icons
- **State persistence:** Use `LocalStorage` for user preferences
