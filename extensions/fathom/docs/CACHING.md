# Meeting Caching Implementation

## Overview

The Fathom Raycast extension now implements aggressive caching for meetings, summaries, and transcripts to enable full-text search and reduce API rate limiting.

## Features

### 1. **Automatic Caching**

- Meetings are automatically cached with their summaries and transcripts when loaded
- Cache stores meetings in Raycast's encrypted LocalStorage
- Lazy pagination: initially loads ~50 meetings, with option to load more

### 2. **Full-Text Search**

- Search across meeting titles, summaries, AND transcripts
- Multi-term search support (all terms must match)
- Case-insensitive search
- Results are filtered in real-time as you type

### 3. **Smart Cache Refresh**

- **Cache staleness detection**: Only fetches fresh data if cache is >5 minutes old
- **Instant loading**: Shows cached meetings immediately when reopening within 5 minutes
- **Background refresh**: Automatically fetches new meetings when cache is stale
- **Manual refresh**: Available via ⌘-R to force fresh data regardless of cache age

### 4. **Lazy Pagination**

- **Initial load**: Fetches ~50 meetings (5 pages) for fast startup
- **Load more**: Scroll to the bottom of the list to fetch next ~50 meetings on demand via native Raycast List pagination
- **Incremental loading**: Cursor-based pagination tracks position across sessions
- **Has more detection**: `hasMore` initialized synchronously from `cacheManager` so pagination is offered from the first render

### 5. **Smart Cache Invalidation**

- **Meetings/Summaries/Transcripts**: 30-day TTL (rarely change after creation)
- **Action Items**: 6-hour TTL (status can change frequently)
- Automatic cache pruning keeps storage optimized
- Manual refresh available via UI actions

### 6. **API Optimization**

- Reduces API calls by serving cached data
- Includes `include_summary=true` and `include_transcript=true` query params
- 5-minute cooldown between automatic background fetches
- Helps avoid rate limiting issues

## Architecture

### Files

```text
src/
├── utils/
│   ├── cache.ts                  # Core caching utilities
│   └── cacheManager.ts           # Cache manager with pagination & staleness logic
├── hooks/
│   └── useCachedMeetings.ts      # React hook with loadMore support
└── search-meetings.tsx            # UI with ⌘-L "Load Older Meetings" action
```

### Cache Storage Structure

#### Cache Keys

- `cache:meeting:{recordingId}` - Individual meeting data
- `cache:meeting:index` - Index of all cached meeting IDs
- `cache:metadata` - Cache metadata (total meetings, dates, etc.)

#### Cached Data Format

```typescript
{
  meeting: Meeting,           // Full meeting object
  summary?: string,           // Markdown-formatted summary
  transcript?: string,        // Full transcript text — ~92% of the value's size
  actionItems?: ActionItem[], // Action items array
  cachedAt: number,          // Timestamp when cached
  hash: string               // Content hash for validation
}
```

### Write path — writes MUST be sequential

`cacheMeetingsBatch` writes meetings one at a time, awaiting each.

**Concurrent `LocalStorage.setItem` calls clobber each other.** This was the cause of the
long-standing "only 3 meetings appear" bug. Measured:

| payload size | parallel writes   | persisted |
| ------------ | ----------------- | --------- |
| 185,280 B    | 50                | 5         |
| 8,673 B      | 50                | 3         |
| 8,673 B      | 50 **sequential** | **50**    |

Shrinking payloads 21× made it worse, so this is not a size limit. Raycast's LocalStorage behaves
like a single document that each `setItem` reads, mutates and writes back — N parallel writers
share one snapshot, last write wins, everything else is lost. **Every call still resolves
successfully.** Nothing throws.

The same hazard applies to `removeItem`, so `pruneExpiredFromIndex` and `pruneCache` are
sequential too. **Do not "optimize" any of these back into `Promise.all`.**

Writes are then verified by reading back, and a mismatch logs `SILENT WRITE LOSS` with counts.
A successful write is not evidence the data is there.

### Read path — silent drops are logged

`getAllCachedMeetings()` can discard an entry in two ways, both previously silent:

- **Expired TTL** — expected, and pruned from the index.
- **Malformed JSON** — was a bare `catch {}`. Now logs the offending key.

It also emits an accounting line whenever stored keys ≠ returned meetings:

```text
[cache] getAllCachedMeetings accounting { storedKeys: 50, returned: 3, expired: 0, malformed: 47 }
```

If the list is short, that line names the cause. Its absence for months is why a large shortfall
went undiagnosed.

## Usage

### In `search-meetings.tsx`

The component automatically uses the cache:

```typescript
const {
  meetings: cachedMeetings,
  isLoading,
  error,
  searchMeetings,
  refreshCache,
  loadMore, // NEW: Load next batch of meetings
  hasMore, // NEW: Whether more meetings are available
} = useCachedMeetings({
  filter: {},
  enableCache: true,
});

// Full-text search
const results = searchMeetings("keyword");

// Manual refresh (forces fresh fetch)
await refreshCache();

// Load more meetings (⌘-L in UI)
await loadMore();
```

### Search Behavior

1. **No query**: Shows all cached meetings grouped by date (This Week, Last Week, Previous Month, Older)
2. **With query**: Searches titles, summaries, and transcripts across ALL cached meetings
3. **Team filter**: Applies after search, filtering by team name
4. **Load more**: Scroll to the bottom of the list — Raycast List pagination triggers automatically

### Keyboard Shortcuts

- **⌘-R**: Refresh cache (force fresh fetch from API)

## Cache Management

### Automatic Behavior

| Scenario                | Behavior                                                          |
| ----------------------- | ----------------------------------------------------------------- |
| First launch            | Shows cached meetings instantly, fetches fresh data in background |
| Reopen within 5 minutes | Shows cached meetings immediately, no API calls                   |
| Reopen after 5 minutes  | Shows cached meetings, silently refreshes in background           |
| Manual refresh (⌘-R)    | Forces fresh fetch regardless of cache age                        |

### Cache Staleness Detection

The cache manager tracks `lastCacheUpdateTime` and considers cache stale after 5 minutes:

```typescript
// In cacheManager.ts
private CACHE_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

isCacheStale(): boolean {
  if (!this.lastCacheUpdateTime) return true;
  const age = Date.now() - this.lastCacheUpdateTime;
  return age > this.CACHE_STALE_THRESHOLD;
}
```

### Loading More Meetings

When the user scrolls to the bottom of the list, Raycast List pagination triggers `onLoadMore`:

1. Fetches next 5 pages (~50 meetings) from API using stored cursor
2. Merges new meetings with existing cache
3. Updates cursor for next incremental load
4. Updates `hasMore` state; `pageSize: 20` controls how many skeleton placeholders display while loading

### Clearing Cache

To manually clear all cached data (for development/debugging):

```typescript
import { clearAllCache } from "./utils/cache";

await clearAllCache();
```

## API Changes

### Query Parameters Added

The `listMeetingsHTTP` function now includes:

- `include_action_items=true` (existing)
- `include_summary=true` (new)
- `include_transcript=true` (new)

### Pagination Support

The `listAllMeetings` function supports lazy pagination:

```typescript
// Fetch first 50 meetings (5 pages)
const result = await listAllMeetings(filter, onProgress, 5);
// result.meetings: Meeting[]
// result.nextCursor: string | undefined

// Fetch next 50 meetings using cursor
const moreResult = await listAllMeetings({ ...filter, cursor: result.nextCursor }, onProgress, 5);
```

The `Meeting` interface now includes optional embedded content:

- `summaryText?: string`
- `transcriptText?: string`

These fields are populated when meetings are fetched with the new query parameters.

## Performance Considerations

### Storage — measured, not estimated

Measured against the live API on 2026-08-01 (`include_summary` + `include_transcript`):

| Request                              | Items | Payload    |
| ------------------------------------ | ----- | ---------- |
| No `include_*`                       | 10    | **13 kB**  |
| `include_summary` only               | 10    | **86 kB**  |
| `include_transcript` only            | 10    | **916 kB** |
| All three (what the extension sends) | 10    | **990 kB** |

So a cached meeting averages **~99 kB, of which the transcript is ~92%**. At the 500-meeting
cache cap that projects to roughly **50 MB in LocalStorage**.

Two consequences worth understanding before changing anything here:

1. **`getAllCachedMeetings()` deserializes every transcript on every launch.** It calls
   `LocalStorage.allItems()` and JSON-parses each value — tens of megabytes — purely to render a
   list showing title, date and duration. The transcript is not read again until a detail view
   opens.
2. **Large values make batch writes fragile.** See the `Promise.allSettled` note under
   _Write path_ below; this was a real, user-visible failure, not a theoretical one.

`include_*` params change payload size but **not** page size — the API returns 10 items per page
either way, with `next_cursor` for more. Requesting transcripts does not reduce how many meetings
you get back.

### Storage limits

Raycast documents no LocalStorage size limit. That is not the same as there being none, and the
extension currently stores far more per key than most extensions do. Treat a failed write as
expected rather than exceptional — which is why writes are now individually settled and logged.

### Search Performance

- Search is client-side over cached data
- O(n × m) where n = meetings, m = search terms
- With 50 meetings, search is instant (<100ms)

### Network

- **Initial load**: Fetches ~50 meetings with summaries/transcripts
- **Reopen <5 min**: Zero API calls (cache only)
- **Reopen >5 min**: Background refresh with minimal UI impact
- **Manual refresh**: Full fetch with progress toast
- **Load more**: Incremental fetch of next 50 meetings

### Loading States

Toast messages now clearly indicate the operation:

- `"Fetching meetings from Fathom API..."` - Downloading from cloud
- `"Fetching from Fathom API... (30 downloaded)"` - Progress update
- `"Saving 50 meetings to local cache..."` - Persisting to disk
- `"50 meetings ready — cached locally"` - Complete
- `"50 older meetings cached locally"` - Incremental load complete

## Proposed: move transcripts out of LocalStorage

**Status: proposed, not implemented.** Recorded here because the measurements above make the case
concrete.

Transcripts are ~92% of every cached value and are read only when a detail view opens or an
export runs — yet they are deserialized on every launch to render a list of titles and dates.

### The shape

| Where                                                   | What                                | Read when                              |
| ------------------------------------------------------- | ----------------------------------- | -------------------------------------- |
| `environment.supportPath/transcripts/<recordingId>.txt` | Full transcript                     | A detail view opens, or an export runs |
| LocalStorage                                            | Meeting metadata + summary          | Every launch (small)                   |
| LocalStorage                                            | Normalized search index per meeting | Every keystroke while searching        |

### Why `.txt` and not `.md`

These are transcripts, not documents. `formatTranscriptToMarkdown` produces
`**Speaker** [00:05:32]` markup for _display_; persisting that as `.md` invites something
downstream to treat it as a document to render. Plain text is what the data is, and what search
consumes.

### The constraint that shapes the design

`searchMeetings` runs full-text over titles, summaries **and transcripts**, synchronously, on
every keystroke. Naively moving transcripts to files forces a choice between reading 500 files
per keystroke (unusable) and dropping transcript search (a documented feature).

Hence the third row: a **normalized search index** — lowercased, deduplicated word set per
meeting — stays in LocalStorage. It is a fraction of the full text, keeps search synchronous, and
keeps each stored value small enough that one oversized entry can't jeopardize a batch.

### Before implementing

This is a **cache-format migration**. Existing users have transcripts inside LocalStorage values;
new code must either tolerate both shapes or migrate transparently on read. Getting that wrong
discards cached data users already have. Worth its own pass, with the migration path tested
against a populated cache — not bolted onto an unrelated change.

## Future Enhancements

### Potential Improvements

1. **Incremental Sync**: Only fetch new meetings since last cache update (using `createdAfter`)
2. **Cache Persistence**: Export/import cache for device migration
3. **Background Sync**: Periodic refresh of action items without user interaction
4. **Cache Analytics**: Show cache hit rate and storage usage in preferences
5. **Selective Loading**: Configurable initial page count (e.g., 3, 5, or 10 pages)

### Known Limitations

1. Cache is per-extension instance (not synced across devices)
2. Large transcripts dominate cache size (~92% of each stored value) and are deserialized on
   every launch even though the list view never displays them — see the transcript-storage
   proposal above
3. No fuzzy matching or relevance scoring in search
4. Action item status updates require manual cache refresh or 6-hour TTL expiration
5. Search is limited to cached meetings (use ⌘-L to expand corpus)

## Troubleshooting

### Cache Not Working

1. Check browser console for errors
2. Verify LocalStorage permissions in Raycast
3. Try clearing cache and refreshing: `await clearAllCache()`

### Search Not Finding Results

1. Ensure meetings are cached (check loading state)
2. Scroll to the bottom to load more meetings and expand the search corpus
3. Verify search terms are spelled correctly
4. Try single-word searches to narrow down issues
5. Check that summaries/transcripts are present in cached data

### Rate Limiting Still Occurring

1. Verify cache is being used (should see cached data immediately)
2. Check that `enableCache: true` is set in `useCachedMeetings`
3. Ensure refresh actions don't trigger excessive API calls
4. Check that cache staleness threshold (5 min) is working

## Development Notes

### Testing Cache Behavior

```typescript
import { getAllCachedMeetings, getCacheMetadata } from "./utils/cache";
import { cacheManager } from "./utils/cacheManager";

// Check cached meetings
const cached = await getAllCachedMeetings();
console.log(`Cached ${cached.length} meetings`);

// Check cache metadata
const metadata = await getCacheMetadata();
console.log(metadata);

// Check cache staleness
console.log(`Cache stale: ${cacheManager.isCacheStale()}`);
console.log(`Cache age: ${cacheManager.getCacheAgeMinutes()} minutes`);

// Check if more meetings available
console.log(`Has more: ${cacheManager.hasMore()}`);
```

### Testing Pagination

```typescript
// Load initial batch
await cacheManager.fetchAndCache({}, { force: true });

// Load more meetings
await cacheManager.loadMoreMeetings({});

// Check updated state
const meetings = await getAllCachedMeetings();
console.log(`Now have ${meetings.length} meetings`);
console.log(`More available: ${cacheManager.hasMore()}`);
```

### Debugging

Enable verbose logging in `cache.ts` by uncommenting debug statements or adding:

```typescript
console.log("[Cache]", message, data);
```

## References

- [Raycast LocalStorage API](https://developers.raycast.com/api-reference/storage)
- [useLocalStorage Hook](https://developers.raycast.com/utilities/react-hooks/uselocalstorage)
- [Fathom API Documentation](https://developers.fathom.ai)
