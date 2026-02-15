# Tella

Raycast extension for browsing videos, viewing transcripts, and managing playlists with Tella.

## Features

- **Videos**: View all your Tella videos in list or grid view with sorting and filtering
- **Playlists**: Manage playlists and view videos within playlists
- **Transcripts**: Search across all video transcripts with intelligent caching
- **Overview Dashboard**: See your video statistics, top videos, and recent content at a glance

## Commands

### Overview

Get a high-level view of your Tella content with:
- Total views and video count
- Total watch time (sync to calculate)
- Top 3 most-viewed videos
- Recent videos
- Content volume (this week, this month, all time)
- Playlist count

**Shortcuts:**
- `⌘R` - Sync now (refresh all data)

### Videos

Browse and manage all your Tella videos with powerful features:

- **List and Grid Views**: Toggle between list and grid layouts (`⌘G` / `⌘L`)
- **Sorting**: Sort by date (newest/oldest), views (most/least), or name (A-Z/Z-A)
- **Search**: Filter videos by name or description
- **Actions**:
  - Open in browser
  - Copy video or embed links
  - View or copy transcript
  - Edit video settings (`⇧⌘,`)
  - Add to playlist (with option to create new playlist)
  - Duplicate and open video
  - Delete video

**Shortcuts:**
- `⌘R` - Refresh videos
- `⌘G` - Switch to grid view
- `⌘L` - Switch to list view

### Playlists

Manage your Tella playlists:

- **Quick Access**: Direct link to "My Videos" on Tella
- **Filter**: View personal or organization playlists
- **Actions**:
  - Browse videos in playlist (primary action)
  - Open playlist in browser
  - Create new playlist (`⌘N`)
  - Rename playlist
  - Delete playlist

**Shortcuts:**
- `⌘R` - Refresh playlists
- `⌘N` - Create new playlist

### Transcripts

Search across all video transcripts with intelligent caching:

- **Browse Mode**: View all transcripts in a split-pane view
- **Search**: Find videos by searching transcript content
- **Caching**: Transcripts are cached locally for instant subsequent searches
- **Actions**:
  - Copy transcript (`⌘C`)
  - View full transcript
  - Open video in browser
  - Refresh transcripts (`⌘R`)
  - Clear transcript cache
  - Open cache folder

**Shortcuts:**
- `⌘C` - Copy transcript
- `⌘⇧C` - Copy transcript with timestamps
- `⌘⇧S` - Copy transcript as SRT
- `⌘R` - Refresh transcripts

### AI Chat

Chat with your videos using Raycast's native AI Chat:

- Type `@tella` in Raycast AI Chat
- Ask questions like "What did I say about..." or "Find mentions of..."
- Get answers synthesized from your video transcripts with source citations

The AI tool searches your cached transcripts and returns relevant excerpts with video names and timestamps.

## Setup

1. **Install the extension** from the Raycast Store
2. **Get your API key**:
   - Go to [tella.tv/account](https://www.tella.tv/account)
   - Scroll to the "API" section
   - Click "Generate API Key" and copy it
3. **Configure the extension**:
   - Open Raycast and run any Tella command
   - You'll be prompted to enter your API key
   - Paste your key and press Enter

That's it! You can now browse videos, search transcripts, and manage playlists.

## Configuration

### Cache Duration

Control how long video data is cached before refreshing:

- **5 minutes**: Frequent updates, more API calls
- **30 minutes** (default): Balanced performance
- **1 hour**: Less frequent updates, fewer API calls
- **Manual refresh only**: Cache never expires automatically

The cache is always refreshed when you use the refresh action (`⌘R`).

## Troubleshooting

### Videos not loading

1. Verify your API key is correct in extension preferences
2. Check your internet connection
3. Try refreshing (`⌘R`)
4. If issues persist, check the error details (press Enter on error screen to copy debug info)

### Transcripts not appearing

- Transcripts are only available for videos that have been processed
- Check the transcript status in the video detail view
- Use "Refresh Transcripts" to fetch latest transcript status

### Cache issues

- Clear transcript cache: `⌘K` → "Clear Transcript Cache" in Transcripts
- Video cache refreshes automatically based on your cache duration setting
- Force refresh: Use `⌘R` in any command

## Documentation

- [API Reference](docs/API.md) — Complete Tella API documentation
- [Development Patterns](docs/DEVELOPMENT.md) — Coding conventions and error handling patterns
- [Features & Roadmap](docs/Features%20%26%20Roadmap.md) — Features built and planned

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this extension.

## Author

**Jack Vaughan** — [jackvaughan.com](https://jackvaughan.com)

## License

MIT
