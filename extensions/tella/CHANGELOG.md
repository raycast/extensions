# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-14

### Added

- **Overview Command**: Dashboard view with video statistics, top videos, recent content, and total watch time
- **Browse Videos Command**: List and grid views for browsing all Tella videos with sorting and filtering
- **Browse Playlists Command**: Manage playlists and view videos within playlists
- **Search Transcripts Command**: Search across all video transcripts with caching for fast subsequent searches
- **AI Chat Integration**: Use `@tella` in Raycast AI Chat to ask questions about your videos
- Video management actions: duplicate, delete, update, add to playlists
- Edit video settings form: name, description, visibility, playback, downloads, SEO
- Export functionality (with graceful handling of API limitations)
- Transcript viewing and copying with timestamps and SRT format
- Smart caching system with configurable duration
- Grid and list view toggle with persistent preferences
- Comprehensive error handling with debug information

### Features

- Pagination support for large video collections
- Background refresh of cached data
- Incremental transcript caching (only fetches new videos)
- Rate limiting handling with exponential backoff
- Persistent user preferences (view mode, sort order)
- AI tool for searching transcripts with keyword matching and source citations
