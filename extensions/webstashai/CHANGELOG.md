# Changelog

## 1.0.0 — 2026-04-11

Initial release of the WebStashAI Raycast extension.

### Commands

- **Search Pages** — Hybrid semantic + keyword search with deeplink support
- **Browse Library** — Paginated browsing with status, domain, and tag filters
- **Save Page** — Save URLs with clipboard auto-fill and duplicate detection
- **View Highlights** — Browse, search, add, and delete highlights
- **Browse Tags** — View, rename, and merge tags with dry-run previews
- **Browse Collections** — Explore auto-generated topic collections
- **Review Highlights** — Spaced repetition with Soon/Later/Someday/Discard feedback
- **Synthesize** — AI-powered briefings with quota awareness
- **Library Stats** — Page counts, quota usage, top domains, and top tags
- **Import Bookmarks** — Bulk import from HTML, CSV, or URL lists
- **Background Sync** — Silent 30-minute cache refresh

### Features

- API key authentication via Raycast preferences
- Optimistic UI for favorite, pin, and delete actions
- Cursor-based infinite scroll pagination
- Instant load from cached data with background revalidation
- Rich page detail with metadata sidebar and OG image thumbnails
- Comprehensive error handling with server request IDs
- Auto-retry on rate limits and transient server errors
