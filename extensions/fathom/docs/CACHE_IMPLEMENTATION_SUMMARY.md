# Cache Implementation Summary

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

- ~10-100KB per meeting (with summary + transcript)
- 50 meetings ≈ 500KB - 5MB total
- All encrypted by Raycast

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
