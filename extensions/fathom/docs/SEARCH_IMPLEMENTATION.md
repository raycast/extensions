# Full-Text Search Implementation

## Overview

The search functionality in `search-meetings.tsx` performs full-text search across meeting titles, summaries, and transcripts. This document explains how the search works, the issues that were fixed, and how to monitor search performance via logging.

## Architecture

### Data Flow

```text
API Call (listMeetings)
    ↓
SDK Converter (convertSDKMeeting)
    ↓
Cache Manager (cacheApiResults)
    ↓
Local Storage (cacheMeeting)
    ↓
Search Function (searchCachedMeetings)
    ↓
UI Display (search-meetings.tsx)
```

## Components

### 1. API Layer (`src/fathom/api.ts`)

**Function:** `listMeetings(filter: MeetingFilter)`

The API call now includes three critical parameters:

```typescript
const result = await client.listMeetings({
  cursor: filter.cursor,
  calendarInvitees: filter.calendarInvitees,
  calendarInviteesDomains: filter.calendarInviteesDomains,
  // Include summaries and transcripts for full-text search
  includeSummary: true,
  includeTranscript: true,
  includeActionItems: true,
});
```

**Why these parameters matter:**

- `includeSummary: true` - Fetches AI-generated summaries from Fathom
- `includeTranscript: true` - Fetches full meeting transcripts with speaker names and timestamps
- `includeActionItems: true` - Fetches action items for completeness

**Logging:**

```text
[API] 📋 listMeetings called with filter: {...}
[API] 🔵 Calling Fathom SDK client.listMeetings()...
[API] ✅ SDK returned 30 meetings
```

### 2. SDK Converter (`src/utils/converters.ts`)

**Function:** `convertSDKMeeting(m: SDKMeeting): Meeting`

Extracts summary and transcript from SDK response:

```typescript
// Extract summary text from defaultSummary
const summaryText = m.defaultSummary?.markdownFormatted || undefined;

// Extract transcript text from transcript array
let transcriptText: string | undefined;
if (m.transcript && Array.isArray(m.transcript) && m.transcript.length > 0) {
  transcriptText = m.transcript
    .map((item) => {
      const speaker = item.speaker?.displayName || "Unknown";
      const timestamp = item.timestamp || "";
      const text = item.text || "";
      return `${speaker} [${timestamp}]: ${text}`;
    })
    .join("\n");
}
```

**Output format:**

```text
John Smith [00:05:23]: Let's discuss the Q1 roadmap
Jane Doe [00:05:45]: I agree, we should focus on performance
```

### 3. Cache Manager (`src/utils/cacheManager.ts`)

**Function:** `cacheApiResults(meetings: Meeting[])`

Stores meetings with their summaries and transcripts:

```typescript
await cacheMeeting(
  meeting.recordingId,
  meeting,
  meeting.summaryText,      // AI summary
  meeting.transcriptText,   // Full transcript
  meeting.actionItems,
);
```

**Logging:**

```text
[CacheManager] Caching 30 meetings
[CacheManager] Cache updated, now have 30 meetings
```

### 4. Search Function (`src/utils/cache.ts`)

**Function:** `searchCachedMeetings(cachedMeetings: CachedMeetingData[], query: string): CachedMeetingData[]`

Performs case-insensitive, multi-term search across all meeting content:

```typescript
const searchTerms = query.toLowerCase().split(/\s+/);

return cachedMeetings.filter((cached) => {
  const searchableText = [
    meeting.title || "",
    meeting.meetingTitle || "",
    cached.summary || "",
    cached.transcript || "",
  ]
    .join(" ")
    .toLowerCase();

  // ALL search terms must be present (AND logic)
  return searchTerms.every((term) => searchableText.includes(term));
});
```

**Search Logic:**

- Query is split by whitespace into individual terms
- All text is converted to lowercase for case-insensitive matching
- **AND logic:** All terms must be present in the combined text
- Searches across: title, meetingTitle, summary, and transcript

**Example:**

- Query: `"social media strategy"`
- Terms: `["social", "media", "strategy"]`
- Match: Meeting with title "Q1 Planning" + summary containing "social media" + transcript containing "strategy"
- No match: Meeting with only "social" and "media" but no "strategy"

## Logging for Debugging

The search function includes comprehensive logging to help diagnose issues:

```typescript
logger.log(`[searchCachedMeetings] Searching for: "${query}" (terms: ${searchTerms.join(", ")})`);
logger.log(`[searchCachedMeetings] Total meetings to search: ${cachedMeetings.length}`);
logger.log(`[searchCachedMeetings] Cache stats: ${withSummary} with summaries, ${withTranscript} with transcripts`);
logger.log(`[searchCachedMeetings] Found ${results.length} matching meetings`);
```

### Example Console Output

When searching for "social":

```text
[searchCachedMeetings] Searching for: "social" (terms: social)
[searchCachedMeetings] Total meetings to search: 30
[searchCachedMeetings] Cache stats: 30 with summaries, 30 with transcripts
[searchCachedMeetings] Meeting "Q1 Planning" (123456): title=15ch, summary=1200ch, transcript=5800ch, matches=true
[searchCachedMeetings] Meeting "Team Sync" (123457): title=9ch, summary=950ch, transcript=3200ch, matches=false
[searchCachedMeetings] Meeting "Social Media Strategy" (123458): title=22ch, summary=1500ch, transcript=8500ch, matches=true
[searchCachedMeetings] Found 2 matching meetings
```

**Log fields:**

- `title=15ch` - Title length in characters
- `summary=1200ch` - Summary length in characters
- `transcript=5800ch` - Transcript length in characters
- `matches=true/false` - Whether this meeting matched the search

## Issues Fixed

### Issue 1: Transcripts Not Included in Search

**Problem:** Searching for 1-2 character terms filtered results to zero, and transcripts weren't being searched even though they existed in the API.

**Root Cause:** The SDK `listMeetings()` call wasn't requesting summaries and transcripts with `includeSummary` and `includeTranscript` parameters.

**Solution:** Added the parameters to the SDK call in `src/fathom/api.ts`.

### Issue 2: SDK Converter Not Extracting Summary/Transcript

**Problem:** Even if the API returned summaries and transcripts, they weren't being extracted and stored in the cache.

**Root Cause:** The `convertSDKMeeting()` function only extracted basic meeting info, ignoring `defaultSummary` and `transcript` fields.

**Solution:** Updated the converter to extract:

- `m.defaultSummary?.markdownFormatted` → `summaryText`
- `m.transcript` array → `transcriptText` (formatted with speaker names and timestamps)

### Issue 3: No Visibility into Search Performance

**Problem:** When search wasn't working, there was no way to see what was being searched or why results were empty.

**Root Cause:** The search function had no logging.

**Solution:** Added comprehensive logging showing:

- Search terms being used
- Total meetings in cache
- How many meetings have summaries/transcripts
- Detailed match info for first 3 meetings
- Total matches found

## How to Monitor Search

### Enable Verbose Logging

In Raycast extension preferences:

1. Open Fathom extension settings
2. Enable "Verbose Logging"
3. Open Console

### Check Cache Status

When you search, look for these log patterns:

**Good (cache populated):**

```text
[searchCachedMeetings] Cache stats: 30 with summaries, 30 with transcripts
[searchCachedMeetings] Found 5 matching meetings
```

**Problem (no summaries/transcripts):**

```text
[searchCachedMeetings] Cache stats: 0 with summaries, 0 with transcripts
[searchCachedMeetings] Found 0 matching meetings
```

**Solution:** Refresh the cache (Cmd+Shift+R in search view) to fetch data with summaries/transcripts.

## Performance Considerations

### Search Complexity

- **Time:** O(n × m) where n = meetings, m = average search terms
- **Space:** O(n) for filtered results
- **Typical:** 30 meetings, 3 terms = ~90 comparisons

### Cache Size

- Default: Keep 50 most recent meetings
- Each meeting: ~50KB (title + summary + transcript)
- Total: ~2.5MB for full cache

### Search Speed

- Local search: <100ms for 30 meetings
- No network latency
- Instant results as you type

## Testing Search

### Test Cases

1. **Single term match:**
   - Search: `"social"`
   - Expected: All meetings mentioning "social" in any field

2. **Multi-term AND search:**
   - Search: `"social media"`
   - Expected: Only meetings with BOTH "social" AND "media"

3. **Case insensitive:**
   - Search: `"SOCIAL"`
   - Expected: Same results as `"social"`

4. **Transcript search:**
   - Search for a specific speaker name or phrase from transcript
   - Expected: Meeting appears even if not in title/summary

5. **No results:**
   - Search: `"xyzabc123"`
   - Expected: Empty state with "No meetings match your search"

## Future Improvements

- [ ] Fuzzy matching for typos
- [ ] Weighted search (title > summary > transcript)
- [ ] Search result highlighting
- [ ] Advanced query syntax (AND, OR, NOT)
- [ ] Search history/suggestions
- [ ] Indexed search for faster performance on large caches
