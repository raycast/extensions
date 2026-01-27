# Meeting Caching Implementation

## Overview

The Fathom Raycast extension now implements aggressive caching for meetings, summaries, and transcripts to enable full-text search and reduce API rate limiting.

## Features

### 1. **Automatic Caching**
- Meetings are automatically cached with their summaries and transcripts when loaded
- Cache stores up to 50 most recent meetings by default
- Cache is encrypted and stored using Raycast's secure LocalStorage

### 2. **Full-Text Search**
- Search across meeting titles, summaries, AND transcripts
- Multi-term search support (all terms must match)
- Case-insensitive search
- Results are filtered in real-time as you type

### 3. **Smart Cache Invalidation**
- **Meetings/Summaries/Transcripts**: 30-day TTL (rarely change after creation)
- **Action Items**: 6-hour TTL (status can change frequently)
- Automatic cache pruning keeps only the most recent 50 meetings
- Manual refresh available via UI actions

### 4. **API Optimization**
- Reduces API calls by serving cached data
- Includes `include_summary=true` and `include_transcript=true` query params
- Helps avoid rate limiting issues

## Architecture

### Files

```
src/
├── utils/
│   └── cache.ts                  # Core caching utilities
├── hooks/
│   └── useCachedMeetings.ts      # React hook for cached meetings
└── search-meetings.tsx            # Updated UI with full-text search
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
  transcript?: string,        // Full transcript text
  actionItems?: ActionItem[], // Action items array
  cachedAt: number,          // Timestamp when cached
  hash: string               // Content hash for validation
}
```

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
} = useCachedMeetings({
  filter: {},
  enableCache: true,
});

// Full-text search
const results = searchMeetings("keyword");

// Manual refresh
await refreshCache();
```

### Search Behavior

1. **No query**: Shows all cached meetings grouped by date
2. **With query**: Searches titles, summaries, and transcripts
3. **Team filter**: Applies after search, filtering by team name
4. **Date filter**: Only applied when showing "All Meetings" (not when filtered by team)

## Cache Management

### Automatic Pruning
The cache automatically maintains size limits:
- Keeps the 50 most recently cached meetings
- Older meetings are removed when limit is exceeded
- Runs after each new batch of meetings is cached

### Manual Refresh
Users can refresh the cache via:
- Empty state "Refresh Cache" action
- Error state "Refresh Cache" action

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

### Type Updates
The `Meeting` interface now includes optional embedded content:
- `summaryText?: string`
- `transcriptText?: string`

These fields are populated when meetings are fetched with the new query parameters.

## Performance Considerations

### Storage
- Each meeting with summary and transcript can be 10-100KB
- 50 meetings = ~500KB - 5MB total
- Raycast LocalStorage has no documented size limits, but is encrypted and performant

### Search Performance
- Search is client-side over cached data
- O(n × m) where n = meetings, m = search terms
- With 50 meetings, search is instant (<100ms)

### Network
- Initial load fetches meetings with summaries/transcripts (larger payload)
- Subsequent views use cache (zero network requests)
- Refresh triggers new API call with full data

## Future Enhancements

### Potential Improvements
1. **Incremental Updates**: Only fetch new meetings since last cache update
2. **Selective Caching**: Cache summaries/transcripts on-demand for viewed meetings
3. **Background Sync**: Periodically refresh action items in the background
4. **Cache Analytics**: Show cache hit rate and storage usage in preferences
5. **Export Cache**: Allow exporting cached meetings for backup/analysis

### Known Limitations
1. Cache is per-extension instance (not synced across devices)
2. Large transcripts increase payload size on initial load
3. No fuzzy matching or relevance scoring in search
4. Action item status updates require manual cache refresh

## Troubleshooting

### Cache Not Working
1. Check browser console for errors
2. Verify LocalStorage permissions in Raycast
3. Try clearing cache and refreshing: `await clearAllCache()`

### Search Not Finding Results
1. Ensure meetings are cached (check loading state)
2. Verify search terms are spelled correctly
3. Try single-word searches to narrow down issues
4. Check that summaries/transcripts are present in cached data

### Rate Limiting Still Occurring
1. Verify cache is being used (should see cached data immediately)
2. Check that `enableCache: true` is set in `useCachedMeetings`
3. Ensure refresh actions don't trigger excessive API calls

## Development Notes

### Testing Cache Behavior
```typescript
import { getAllCachedMeetings, getCacheMetadata } from "./utils/cache";

// Check cached meetings
const cached = await getAllCachedMeetings();
console.log(`Cached ${cached.length} meetings`);

// Check cache metadata
const metadata = await getCacheMetadata();
console.log(metadata);
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
