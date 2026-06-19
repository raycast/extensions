# Tella API Reference

> This document is kept concise and structured for quick reference — useful for both developers and AI coding assistants.

**Base URL:** `https://api.tella.com/v1`

**Auth:** `Authorization: Bearer <api-key>` header on all requests.

**Types:** `src/types.ts`

---

## Videos

### GET /videos
List all videos with pagination.

**Query params:**
- `cursor` — Pagination cursor from previous response
- `limit` — Items per page (1-100, default: 20)
- `playlistId` — Filter by playlist ID

**Response:** `{ videos: Video[], pagination: { nextCursor?, hasMore } }`

**Note:** List response has fewer fields than detail. Missing: `durationSeconds`, `chapters`, `transcript`, `thumbnails`, `exports`, `settings`, `playlistIds`.

---

### GET /videos/{id}
Get full video details including transcript, chapters, thumbnails, exports, settings.

**Response:** `{ video: Video }` (full object)

---

### PATCH /videos/{id}
Update video metadata and settings.

**Body (all optional, at least one required):**
- `name` — 1-255 chars
- `description` — max 5000 chars
- `defaultPlaybackRate` — 0.5-2.0
- `captionsDefaultEnabled`, `transcriptsEnabled`, `publishDateEnabled`, `viewCountEnabled` — boolean
- `commentsEnabled`, `commentEmailsEnabled`, `downloadsEnabled`, `rawDownloadsEnabled` — boolean
- `linkScope` — `public` | `private` | `password` | `embedonly`
- `password` — 1-255 chars (required if linkScope is `password`)
- `searchEngineIndexingEnabled` — boolean
- `allowedEmbedDomains` — string[] (Premium)
- `customThumbnailURL` — string

**Response:** `{ video: Video }`

---

### DELETE /videos/{id}
Permanently delete a video.

**Response:** `{ status: "ok" }`

---

### POST /videos/{id}/exports
Start a video export.

**⚠️ Status:** This endpoint returns `501 Not Implemented` - "This endpoint is coming soon". The export functionality is not yet available in the Tella API.

**Body:**
- `granularity` — **required**: `story` (full) | `scenes` (individual) | `raw` (original uploads)
- `resolution` — `1080p` (default) | `4k`
- `fps` — `30` (default) | `60` (may require paid plan)
- `subtitles` — boolean, burn into video
- `speed` — `1` | `0.5` | `0.75` | `1.25` | `1.5` | `1.75` | `2`

**Response:** `{ export: { exportId, status, progress, downloadUrl?, updatedAt } }` (when implemented)

---

### POST /videos/{id}/duplicate
Create a copy of a video.

**Body:**
- `name` — 1-255 chars (default: original + " (Copy)")

**Response:** `{ video: Video }`

---

## Playlists

### GET /playlists
List all playlists.

**Query params:**
- `visibility` — `personal` (default) | `org`
- `cursor` — Pagination cursor
- `limit` — 1-100, default: 20

**Response:** `{ playlists: Playlist[], pagination: { nextCursor?, hasMore } }`

---

### POST /playlists
Create a new playlist.

**Body:**
- `name` — **required**, 1-255 chars
- `description` — max 5000 chars
- `emoji` — max 10 chars
- `linkScope` — `public` (default) | `private` | `password` | `embedonly`
- `password` — 1-255 chars (required if linkScope is `password`)
- `searchEngineIndexingEnabled` — boolean (default: false)
- `visibility` — `personal` (default) | `org`

**Response:** `{ playlist: Playlist }`

---

### GET /playlists/{id}
Get playlist details.

**Response:** `{ playlist: Playlist }`

---

### PATCH /playlists/{id}
Update playlist.

**Body (at least one required):**
- `name` — 1-255 chars
- `description` — max 5000 chars
- `linkScope` — `public` | `private` | `password` | `embedonly`
- `password` — 1-255 chars (required if linkScope is `password`)
- `searchEngineIndexingEnabled` — boolean

**Note:** `emoji` cannot be updated after creation. It can only be set when creating a playlist via `POST /playlists`.

**Response:** `{ playlist: Playlist }`

---

### DELETE /playlists/{id}
Delete playlist. Videos are not deleted.

**Response:** `{ status: "ok" }`

---

### POST /playlists/{id}/videos
Add a video to playlist.

**Body:**
- `videoId` — **required**

**Response:** `{ status: "ok" }`

---

### DELETE /playlists/{id}/videos/{videoId}
Remove video from playlist. Video itself is not deleted.

**Response:** `{ status: "ok" }`

---

## Webhooks

### POST /webhooks/endpoints
Create webhook endpoint.

**Body:**
- `url` — **required**, destination URL
- `filterTypes` — **required**, array of event types

**Response:** `{ id, secret }` — secret shown only once

---

### DELETE /webhooks/endpoints/{id}
Delete webhook endpoint.

**Response:** `{ id }`

---

### GET /webhooks/endpoints/{id}/secret
Get signing secret for verifying payloads.

**Response:** `{ key }`

---

### GET /webhooks/messages
List recent webhook messages for debugging.

**Query params:**
- `event_types` — comma-separated filter
- `limit` — default: 10

**Response:** `{ messages: [{ id, eventType, payload, timestamp }] }`

---

### GET /webhooks/messages/{id}
Get specific webhook message.

**Response:** `{ id, eventType, payload, timestamp }`

---

## Webhook Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `video.created` | New video created | `{ videoId, videoName, timestamp }` |
| `export.ready` | Export completed | `{ videoId, videoName, downloadUrl, exportId, timestamp }` |
| `transcript.ready` | Transcript generated | `{ videoId, timestamp }` |
| `playlist.created` | New playlist created | `{ playlistId, playlistName, timestamp }` |
| `playlist.video_added` | Video added to playlist | `{ playlistId, playlistName, videoId, videoName, timestamp }` |

---

## Enums

**LinkScope:** `public` | `private` | `password` | `embedonly`

**Visibility:** `personal` | `org`

**ExportGranularity:** `story` | `scenes` | `raw`

**ExportResolution:** `1080p` | `4k`

**ExportFPS:** `30` | `60`

**ExportSpeed:** `1` | `0.5` | `0.75` | `1.25` | `1.5` | `1.75` | `2`

**TranscriptStatus:** `ready` | `processing` | `failed`

**ExportStatus:** `pending` | `processing` | `completed` | `failed`

---

## Errors

| Status | Meaning |
|--------|---------|
| 400 | Bad Request |
| 401 | Unauthorized (invalid/missing API key) |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation error |
| 429 | Rate limited — check `Retry-After` header |
| 500 | Server error |
| 501 | Not Implemented — endpoint coming soon (e.g., `/videos/{id}/exports`) |

---

## Rate Limiting

- Returns 429 when rate limited
- `Retry-After` header indicates wait time in seconds
- Implementation: exponential backoff with max 3 retries (see `src/api.ts`)

---

## API Limitations

**Not available via API:**
- Starting a new recording (requires Tella app)
- Uploading videos
- Managing team members
- Billing/subscription management
- **Video exports** — `POST /videos/{id}/exports` returns `501 Not Implemented` (coming soon)
