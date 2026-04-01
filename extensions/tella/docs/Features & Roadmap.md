# Features & Roadmap

> This document lists implemented features and future ideas. Update when adding new functionality.

Current features organized by command, plus future ideas.

---

## ⚠️ Rate Limiting & First-Run Experience

**Critical context:** The Tella API has rate limits, and many features require fetching individual video details (transcripts, durations, thumbnails). This means first-run and sync operations can trigger rate limiting if not handled carefully.

### Key Constraints

1. **List vs Detail API** — The `/videos` list endpoint returns basic info only. Transcripts, durations, thumbnails, and settings require individual `/videos/{id}` calls.

2. **Rate Limiting** — The API returns `429 Too Many Requests` when limits are exceeded. The extension handles this with:
   - Automatic retry with exponential backoff (max 3 attempts)
   - User-friendly error screens with retry options
   - `RateLimitError` class for specific handling

3. **First-Run Impact** — New users with many videos will trigger many API calls:
   - 50 videos = 50 individual API calls for transcripts
   - Without delays, this triggers rate limiting

### How We Handle It

**Rate-limited batch processing:**
```typescript
// src/utils.ts
export const FETCH_CONCURRENCY = 3;      // Max concurrent requests
export const BATCH_DELAY_MS = 1000;      // 1 second delay between batches
```

**First-run UX for Transcripts:**
- Shows a setup screen instead of auto-fetching
- Displays video count and time estimate
- User initiates sync (not automatic)
- Progress saved after each batch (can resume if interrupted)
- Shows cached data immediately while syncing new

**Time estimates:**
- 50 videos ≈ 30 seconds
- 100 videos ≈ 1 minute
- Uses `estimateBatchTime()` utility

### When Adding New Features

If your feature needs to fetch individual video details:
1. Use the `batchProcess()` utility or add delays between batches
2. Consider if the data can be cached
3. Show progress for long operations
4. Let users initiate expensive operations (don't auto-fetch)

---

## Overview

Dashboard view showing your Tella content at a glance.

**Features:**
- Total views and video count
- Total watch time (sum of all video durations)
- Top 3 most-viewed videos
- Recent videos
- Content volume (this week, this month, all time)
- Playlist count
- Sync action (`⌘R`)

---

## Videos

Browse and manage all your Tella videos.

**Views:**
- List view with thumbnails, dates, and view counts
- Grid view for visual browsing
- Toggle between views with persistence (`⌘G` / `⌘L`)

**Sorting & Filtering:**
- Sort by date (newest/oldest), views (most/least), name (A-Z/Z-A)
- Search by name or description
- Sort preference persists between sessions

**Video Actions:**
- Open in browser
- Copy video link
- Copy embed link
- View transcript (full detail view)
- Copy transcript to clipboard
- Edit video settings (`⇧⌘,`) — name, description, visibility, playback, downloads, SEO
- Add to playlist (submenu)
- Duplicate and open in browser
- Start export (form with options)
- View exports (status and download)
- Delete with confirmation

**Performance:**
- Smart caching with configurable duration
- Background refresh for stale cache
- Lazy thumbnail loading in grid view

---

## Playlists

Manage your Tella playlists.

**Features:**
- Quick access link to "My Videos" on Tella
- Filter by personal or organization playlists
- Video count per playlist

**Playlist Actions:**
- Browse videos in playlist (opens video list with playlist context)
- Open playlist in browser
- Create new playlist (`⌘N`)
- Rename playlist
- Delete with confirmation

**Within Playlist:**
- All Videos features available
- Remove from playlist action (playlist context only)
- Navigation title shows playlist name

---

## Transcripts

Search across all video transcripts.

**First-Run Experience:**
- Setup screen explains what will happen (video count, time estimate)
- User initiates sync (not automatic) to avoid surprise rate limiting
- Progress bar with "X/Y videos" and time remaining
- Progress saved after each batch (can close and resume)
- Shows cached transcripts immediately while syncing new videos

**Browse Mode:**
- View all videos with transcripts in split-pane view
- Arrow through videos to see each transcript
- Full transcript displayed in detail pane
- Navigation title shows "X pending" when new videos available

**Search Mode:**
- Search transcript content across all videos
- Match highlighting with inline code styling
- Match count displayed

**Transcript Display:**
- Word and character count
- Language indicator
- Copy transcript (`⌘C`)
- Copy transcript with timestamps (`⌘⇧C`) — formatted as `[MM:SS] text`
- Copy transcript as SRT (`⌘⇧S`) — standard subtitle file format
- View full transcript detail

**Caching & Sync:**
- Transcripts cached locally for instant search
- Incremental updates (only fetches new videos)
- "Sync X New Transcripts" action when new videos detected
- Clear cache action
- Open cache folder action
- Rate-limited fetching with 1s delays between batches
- Cache size monitoring with warnings when approaching limits

---

## AI Chat

Chat with your videos using Raycast's native AI Chat.

**Usage:**
- Type `@tella` in Raycast AI Chat to invoke the extension
- Ask questions like "What did I say about..." or "Find mentions of..."
- AI searches your transcripts and synthesizes answers with citations

**Features:**
- Keyword-based search across all cached transcripts
- Source citations with video names and timestamps
- Auto-caches transcripts on first use
- Works with Raycast's native AI Chat interface

**Tool: search-transcripts**
- Tokenizes query into keywords (removes stopwords)
- Scores sentences by keyword matches
- Returns top 10 matching excerpts with timestamps
- Includes video links for deep-linking (AI can provide "Watch Video" links)
- Formatted as citations for AI to synthesize

---

## Shared Features

Features available across multiple commands.

**Rate Limit Handling:**
- Automatic retry with exponential backoff (max 3 attempts)
- User-friendly error screen when rate limited
- "Retry After X seconds" action respects API's retry-after header
- "Retry Now" option for immediate retry
- All batch operations use delays to avoid triggering rate limits

**Error Handling:**
- Consistent error display with debug information
- Press Enter to copy debug info for troubleshooting
- Specific handling for rate limit errors vs general errors

**Preferences:**
- API key configuration
- Cache duration (5min / 30min / 1hr / manual only)

---

## Future Ideas

Potential additions based on API capabilities.

### Video Export
*Blocked: API returns 501 Not Implemented*
- Start export with resolution/FPS/subtitles options
- Export status tracking with progress
- Download completed exports

### Video Management
- Quick edit video name/description inline
- Privacy quick toggle (public/private/password)
- Password-protect and copy shareable link in one action

### Chapter Navigation
- Browse chapters within a video
- Jump to video at chapter timestamp (deeplinks)
- Search chapters across all videos

### Transcript Enhancements
- Sentence-by-sentence view with timing
- AI summarization of transcript content

### Batch Operations
- Bulk add videos to playlist
- Bulk privacy change (make multiple videos public/private)
- Multi-select for delete/duplicate

### Analytics & Insights
- Views over time trends
- Compare stats between videos

### Sharing
- Embed code generator with domain restrictions
- Copy timestamped video links
- Generate password-protected playlist links

### Search
- Global search across videos, playlists, transcripts, and chapters
- Fuzzy search with relevance ranking

### Playlist Enhancements
- Set emoji on playlists
- Quick add to default playlist (keyboard shortcut)
- Reorder videos within playlist
