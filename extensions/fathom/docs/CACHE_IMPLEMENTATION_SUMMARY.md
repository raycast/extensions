# Cache Implementation Summary

> **Status note (2026-08-01).** This document described the cache as designed. A reported bug —
> the list showing 3 meetings when the account has 50+ — showed the implementation did not
> behave as described. **Root cause: concurrent `LocalStorage.setItem` calls silently discard
> each other's writes.** Now fixed and confirmed (50 fetched → 50 displayed). See
> **Corrections** at the end for the full investigation, including two wrong diagnoses worth
> knowing about. Sections above it describe intent; trust Corrections where they disagree.

## What Was Implemented

### 1. **Aggressive Meeting Caching** ✅

- Created `src/utils/cache.ts` with comprehensive caching utilities
- Created `src/utils/cacheManager.ts` with pagination and staleness logic
- Lazy pagination: initially loads ~50 meetings, with native List pagination to load more
- Uses Raycast's encrypted LocalStorage for secure data storage
- Content-addressed caching with SHA-256 hashes for validation

### 2. **Full-Text Search** ✅

- Search now works across:
  - Meeting titles
  - Calendar titles
  - **Summary content** (new)
  - **Transcript content** (new)
- Multi-term search support (all terms must match)
- Case-insensitive matching
- Real-time filtering as user types

### 3. **Smart Cache Refresh** ✅

- **Cache staleness detection**: Only fetches fresh data if cache is >5 minutes old
- **Instant loading**: Shows cached meetings immediately when reopening within 5 minutes
- **Background refresh**: Automatically fetches new meetings when cache is stale
- **Manual refresh**: ⌘-R forces fresh data regardless of cache age
- 5-minute cooldown prevents excessive API calls during rapid reopens

### 4. **Lazy Pagination** ✅

- **Initial load**: Fetches ~50 meetings (5 pages) for fast startup
- **Load more**: Scroll to the bottom — native Raycast List pagination triggers automatically
- **Cursor tracking**: Maintains pagination position across sessions
- **Correct `hasMore` initial state**: Initialized synchronously from `cacheManager.hasMore()` so pagination is offered from the first render, not after the async cache load resolves
- **Correct `pageSize`**: Set to `20` (skeleton placeholder count per Raycast docs), not `50`
- Expands searchable corpus incrementally as user loads more

### 5. **API Optimizations** ✅

- Added query parameters to `/meetings` endpoint:
  - `include_summary=true` - Fetches summary with meeting data
  - `include_transcript=true` - Fetches transcript with meeting data
- Reduces total API calls by embedding data in initial response
- Lazy pagination reduces initial payload vs fetching all meetings
- Helps avoid rate limiting issues

### 6. **Smart Cache Management**

- **Differential TTLs** for different data types:
  - Meetings/Summaries/Transcripts: 30 days (immutable after creation)
  - Action Items: 6 hours (status can change)
- **Automatic pruning**: Keeps cache size optimized
- **Cache invalidation**: Expired data automatically removed on read
- **Staleness tracking**: `lastCacheUpdateTime` tracked for smart refresh

### 7. **React Hook Integration** ✅

- Created `src/hooks/useCachedMeetings.ts`
- Provides:
  - `meetings` - Array of cached meetings
  - `searchMeetings(query)` - Full-text search function
  - `refreshCache()` - Manual refresh trigger (⌘-R)
  - `loadMore()` - Load next batch (called via Raycast List `onLoadMore`)
  - `hasMore` - Whether more meetings available (initialized synchronously from `cacheManager`)
  - `isLoading` - Loading state
  - `error` - Error state
- Shared `toMeeting` helper eliminates duplicated `CachedMeetingData → Meeting` mapping

### 8. **Updated UI** ✅

- Search placeholder: "Search meetings by title, summary, or transcript..."
- Added "Refresh Cache" actions in empty/error states (⌘-R)
- Added native Raycast List pagination for loading older meetings on scroll
- Disabled Raycast's built-in filtering (using custom search instead)
- Controlled search text state for real-time updates

## Files Created

```text
src/
├── utils/
│   ├── cache.ts                    # 298 lines - Core caching logic
│   └── cacheManager.ts             # Cache manager with pagination & staleness
├── hooks/
│   └── useCachedMeetings.ts        # React hook with loadMore support
└── docs/
    └── CACHING.md                   # Documentation
```

## Files Modified

```text
src/
├── fathom/
│   └── api.ts                       # Added query params, listAllMeetings with pagination
├── utils/
│   └── cacheManager.ts              # NEW: Pagination and staleness logic
├── types/
│   └── Types.ts                     # Added summaryText, transcriptText to Meeting
└── search-meetings.tsx              # Integrated cache hook, ⌘-L action
```

## Key Features

### Cache Staleness Detection

The cache manager now tracks freshness and only fetches when needed:

```typescript
// In cacheManager.ts
private CACHE_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

isCacheStale(): boolean {
  if (!this.lastCacheUpdateTime) return true;
  const age = Date.now() - this.lastCacheUpdateTime;
  return age > this.CACHE_STALE_THRESHOLD;
}
```

### Pagination Support

The `listAllMeetings` function supports cursor-based pagination:

```typescript
// Fetch first 50 meetings (5 pages)
const result = await listAllMeetings(filter, onProgress, 5);
// result.meetings: Meeting[]
// result.nextCursor: string | undefined

// Fetch next 50 meetings using cursor
const moreResult = await listAllMeetings({ ...filter, cursor: result.nextCursor }, onProgress, 5);
```

### Loading More Meetings

When the user scrolls to the bottom, Raycast List pagination calls `onLoadMore`:

1. Fetches next 5 pages (~50 meetings) from API using stored cursor
2. Merges new meetings with existing cache
3. Updates cursor for next incremental load
4. Updates `hasMore` state; `pageSize: 20` controls skeleton placeholder count during load

### Cache Storage Structure

- **Key prefix**: `cache:meeting:{recordingId}`
- **Index**: `cache:meeting:index` (tracks all cached meeting IDs)
- **Metadata**: `cache:metadata` (cache statistics)

### Cached Data Format

```typescript
{
  meeting: Meeting,           // Full meeting object
  summary?: string,           // Markdown-formatted summary
  transcript?: string,        // Full transcript with speakers/timestamps
  actionItems?: ActionItem[], // Action items array
  cachedAt: number,          // Unix timestamp
  hash: string               // Content hash (SHA-256)
}
```

### Search Algorithm

1. Split query into terms by whitespace
2. Combine title + meetingTitle + summary + transcript into searchable text
3. Lowercase everything
4. Match ALL terms (AND logic)
5. Return matching meetings

### Cache Lifecycle

```text
1. User opens Search Meetings
   ↓
2. Load cached meetings from LocalStorage (instant)
   ↓
3. IF cache is stale (>5 min):
      Fetch new meetings from API (background, with toast)
      Cache new meetings
      Update lastCacheUpdateTime
   ELSE:
      Use cached data (no API calls)
   ↓
4. Prune old entries if needed
   ↓
5. Display meetings with full-text search
   ↓
6. User can press ⌘-L to load more meetings (expands corpus)
```

## API Changes

### Query Parameters Added to `listMeetingsHTTP`

```typescript
params.push("include_action_items=true"); // Existing
params.push("include_summary=true"); // NEW
params.push("include_transcript=true"); // NEW
```

### Response Parsing

The HTTP mapper now extracts embedded data:

- `summary.markdown_formatted` → `meeting.summaryText`
- `transcript[]` → formatted as markdown → `meeting.transcriptText`

## Performance Impact

### Network

- **Initial load**: Fetches ~50 meetings with summaries/transcripts (5 pages)
- **Reopen <5 min**: Zero API calls (cache only, instant loading)
- **Reopen >5 min**: Background refresh with minimal UI impact
- **Manual refresh (⌘-R)**: Full fetch with progress toast
- **Load more (scroll to bottom)**: Incremental fetch of next 50 meetings
- **Before**: Multiple API calls per meeting (1 for list + 1 for summary + 1 for transcript)
- **After**: Single API call with embedded data + smart cache refresh

### Storage

Measured 2026-08-01 (see Corrections): **~99 kB per meeting**, of which the transcript is ~92%.
50 meetings ≈ 5 MB; at the 500-meeting cache cap, ~50 MB. All encrypted by Raycast.

Note that `getAllCachedMeetings()` deserializes every one of those values on each launch to render
a list of titles and dates.

### Search Speed

- Client-side search over cached data
- O(n × m) where n = meetings, m = search terms
- With 50+ meetings, search is instant (<100ms)
- Search corpus expands as user loads more meetings (⌘-L)
- No network latency for searches

## Testing Instructions

### Manual Testing

1. Run `npm run dev` to start Raycast development mode
2. Open "Search Meetings" command
3. **Initial Load**: Should fetch ~50 meetings (shows "Fetching from Fathom API..." toast)
4. **Instant Reopen**: Close and reopen within 5 minutes - should load instantly with no toast
5. **Stale Refresh**: Wait 5+ minutes, reopen - should show cached data then silently refresh
6. **Search Test**: Type keywords from summary/transcript content (not just titles)
7. **Load More Test**: Scroll to the bottom of the list — 20 placeholder skeletons should appear, then older meetings load
8. **Refresh Test**: Click "Refresh Cache" or press ⌘-R

### Verify Cache State

### Verify Cache

```typescript
// In browser console or added temporarily to code
import { getAllCachedMeetings, getCacheMetadata } from "./utils/cache";
import { cacheManager } from "./utils/cacheManager";

const cached = await getAllCachedMeetings();
console.log(`Cached ${cached.length} meetings`);

const metadata = await getCacheMetadata();
console.log(metadata);

// Check cache freshness
console.log(`Cache stale: ${cacheManager.isCacheStale()}`);
console.log(`Cache age: ${cacheManager.getCacheAgeMinutes()} minutes`);
console.log(`Has more meetings: ${cacheManager.hasMore()}`);
```

### Clear Cache (for testing)

```typescript
import { clearAllCache } from "./utils/cache";

await clearAllCache();
```

## Known Considerations

### What Changes to Action Items

Per your requirement, action items have a shorter TTL (6 hours) because their status can change:

- `completed` status can toggle
- `assignee` can be updated
- After 6 hours, action items are removed from cache but meeting/summary/transcript remain

### What Doesn't Change

These are considered immutable once created:

- Meeting metadata (title, date, attendees, etc.)
- Summary text (rarely changes)
- Transcript text (rarely changes)

### Rate Limiting Protection

- Cache serves data without API calls when fresh (<5 min)
- Reduces likelihood of hitting rate limits
- Manual refresh available via ⌘-R when needed
- Automatic refresh only happens when cache is stale or on explicit user action
- 5-minute cooldown between automatic background fetches

## Future Enhancements

### Potential Improvements

1. **Incremental Sync**: Fetch only new meetings since last cache update (using `createdAfter`)
2. **Cache Persistence**: Export/import cache for device migration
3. **Background Sync**: Periodic refresh of action items without user interaction
4. **Cache Analytics**: Show cache hit rate and storage usage in preferences
5. **Configurable Initial Load**: Allow user to set initial page count (3, 5, or 10 pages)
6. **Fuzzy Search**: Add relevance scoring and typo tolerance

## Build & Lint Status

✅ **Build**: Successful (`npm run build`)
✅ **Lint**: Fixed with Prettier (`npm run fix-lint`)
✅ **TypeScript**: No compilation errors
✅ **Integration**: All imports resolved correctly

## Summary

The implementation successfully adds:

- ✅ Aggressive caching with summaries/transcripts
- ✅ Lazy pagination (~50 meetings initial, scroll-to-load-more via native List pagination)
- ✅ Smart cache refresh (5-min staleness detection)
- ✅ Full-text search across all meeting content
- ✅ Smart TTL management (30 days immutable, 6 hours action items)
- ✅ API optimization with embedded data
- ✅ Reduced rate limiting risk
- ✅ Manual refresh (⌘-R); load more via native List scroll pagination
- ✅ Encrypted local storage via Raycast
- ✅ Content hashing for validation
- ✅ Instant loading when reopening within 5 minutes

The search experience is now significantly more powerful - users can search through actual meeting content rather than just titles, with fast initial loads and incremental expansion of the searchable corpus!

---

## Corrections (2026-08-01)

Written after investigating a report that Search Meetings displayed **3 meetings for an account
with 50+**. Everything here is measured; where it contradicts the sections above, this section is
correct.

### The API was not at fault

Probed directly against the live endpoint:

| Request                 | Items             | Payload | `next_cursor` | Rows missing required fields |
| ----------------------- | ----------------- | ------- | ------------- | ---------------------------- |
| No `include_*`          | 10                | 13 kB   | yes           | 0                            |
| Extension's exact query | 10                | 990 kB  | yes           | 0                            |
| Following the cursor    | 10/page × 5 pages | —       | still more    | 0                            |

The `include_*` parameters change payload size but **not** page size. Every row carried
`recording_id` and `recording_start_time`, so `mapMeetingFromHTTP` was not dropping records
either. Both hypotheses refuted; the loss was in the extension.

### Fixed: a partial batch write could lose an entire page

`cacheMeetingsBatch` used `Promise.all` over `LocalStorage.setItem`. One rejected write rejects
the whole batch — the remaining meetings are never written, the index is never updated, and the
caller sees one generic error. With ~99 kB values (transcripts are ~92% of each), a single
oversized entry could take down all 10 meetings in a page.

Now uses `Promise.allSettled`: writes settle independently, only IDs that actually landed are
indexed, and failures are logged by meeting ID with observed payload sizes.

### Fixed: silent drops on read

`getAllCachedMeetings()` discarded malformed entries via a bare `catch {}` — no log, no counter.
It now names the offending key and emits an accounting line whenever stored keys ≠ returned
meetings:

```text
[cache] getAllCachedMeetings accounting { storedKeys: 50, returned: 3, expired: 0, malformed: 47 }
```

**This is the important change.** The shortfall persisted for months precisely because every
discard path was silent. If the list is short again, that line names the cause.

### Ruled out

- **Page cap** — `MAX_PAGES = 5` (~50 meetings), not 3.
- **Pruning** — `CACHE_SIZE = 500`, far above the observed count.
- **TTL expiry** — meetings have a 30-day TTL; these were days old.

### RESOLVED — the actual root cause (confirmed 2026-08-01)

**Concurrent `LocalStorage.setItem` calls clobber each other.** Not a size ceiling — that was a
wrong diagnosis, and the write-verification added to test it is what disproved it:

| payload size | parallel writes   | persisted |
| ------------ | ----------------- | --------- |
| 185,280 B    | 50                | 5         |
| 8,673 B      | 50                | 3         |
| 8,673 B      | 10                | 2         |
| 8,673 B      | 50 **sequential** | **50**    |

Shrinking payloads 21× made things _worse_, which killed the size hypothesis outright. Survivor
count tracks CONCURRENCY. Raycast's LocalStorage behaves like a single document that each
`setItem` reads, mutates, and writes back — so N parallel writers all start from the same
snapshot, the last one wins, and every other entry is discarded. Every call still resolves
successfully, which is why nothing ever threw and why this survived months of investigation.

**Fix:** `cacheMeetingsBatch` writes sequentially. `pruneExpiredFromIndex` and `pruneCache` had
the identical hazard and were serialized too. Zero parallel LocalStorage mutations remain.

Confirmed by log:

```text
Wrote 50 meetings { largestPayloadBytes: 8673 }
Cache updated, now have 50 meetings { wroteThisBatch: 50, totalAfterMerge: 50, uniqueIds: 50 }
Grouped meetings { input: 50, ..., grouped: 50, lost: 0 }
```

No `SILENT WRITE LOSS` line. 50 fetched, 50 cached, 50 displayed.

### The lesson worth keeping

Three fixes were applied before the real one, and each looked plausible at the time:

1. `Promise.all` → `Promise.allSettled` — a real robustness win, but not the bug
2. Silent-drop logging on read — how the loss was finally localized
3. Transcripts moved out of LocalStorage — a real 20× size win, but not the bug

What actually found it was **verifying the write by reading it back**. A successful `setItem` is
not evidence the data is there. That check stays in the code permanently: it is cheap, and it
converts an invisible data-loss bug into a named log line.

### Related

See `docs/CACHING.md` for the measured storage breakdown and a proposal to move transcripts out
of LocalStorage into `environment.supportPath`, which would shrink the hot path by roughly an
order of magnitude.
