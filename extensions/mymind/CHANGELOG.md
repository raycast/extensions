# mymind Changelog

## [Official API rewrite] - {PR_MERGE_DATE}

A near-complete rewrite against the official mymind API
(`api.mymind.com`), shipping new commands, new actions, and Raycast AI
support.

### Authentication

- **Breaking:** Replaced the legacy JWT / CID / Authenticity Token cookie
  scraping with a real access key. Each request is signed as a
  short-lived HS256 JWT with `path` + `method` + `iat` + `exp` claims
  and the Key ID in the `kid` header. Generate a key at
  <https://access.mymind.com/api> and paste the Key ID and Secret into
  the extension preferences.

### Commands

- **Search My Mind** — server-side semantic search via
  `GET /objects?q=…&semantic=true&rerank=true`, returning hydrated
  objects in one round-trip. Empty query falls back to recency
  browsing. Defaults to a 5-column **Grid** with a Grid/List toggle
  persisted across runs.
- **Add a New Note** — markdown notes via `POST /objects`, no more
  client-side prose conversion.
- **Save to mymind** — one form, three behaviors auto-routed from your
  inputs: paste a URL → URL save; type markdown → note save; pick files
  → multipart blob upload (≤64 MB). Auto-detects (in priority order)
  Finder selection, highlighted text, the active browser tab via the
  Raycast browser extension, and a URL on the clipboard.
- **Quick Save URL** — no-view command with `url`/`title`/`tags`
  arguments. Designed as a target for Raycast Quicklinks (e.g.
  `{Browser URL}`) and external `raycast://` deeplinks.
- **Browse Spaces** — list of spaces with object counts and color
  swatches; opening one batch-fetches the contained cards via
  `GET /objects?id=…&id=…` (chunked at 25 ids/request to stay under URI
  length limits).
- **Browse Tags** — list of tags; opening one runs
  `GET /objects?q=tag:"name"` and renders matching cards.
- **mymind Menu Bar** — count of today's saves in the menu bar, last 8
  items, plus a Cmd+Shift+N quick-capture shortcut into the Save form.
  Refreshes every 10 minutes.

### Card actions

- Show Details (Enter) with metadata sidebar and the markdown body
  rendered inline. Surfaces summary as a blockquote above the body,
  appends a Notes section after, lists extracted `entities` as tags,
  and shows dominant color from `blob.palette` as a tag.
- Manage Notes (Cmd+Shift+N) — add (`POST`), edit (`PUT`), and delete
  (`DELETE`) notes via `/objects/:id/notes/:noteId`.
- Manage Links (Cmd+Shift+K) — list the cards linked to this one via
  the `/links` graph, link a new card via semantic-search pick, or
  remove a manual link via `DELETE /links/:id`. WikiLinks are listed
  read-only with an accessory tag (mymind requires editing the source
  note's `[[…]]` reference to remove them).
- Find Related (Cmd+Shift+R) — pushes a view of semantically related
  cards via `GET /objects?similarTo=:id` (one round-trip).
- Edit Card (Cmd+E) — read existing content, edit title, summary,
  and markdown, save back via `PATCH /objects/:id` and `PUT
  /objects/:id/content`.
- Manage Spaces (Cmd+Shift+S) — toggle the card in or out of any space
  via `PUT`/`DELETE /spaces/:spaceId/objects/:objectId`.
- Manage Tags (Cmd+Shift+T) — add via `POST /objects/:id/tags` and
  remove via `DELETE /objects/:id/tags`. The form pre-selects current
  tags; deselecting one removes it on save.
- Copy as Markdown (Cmd+Shift+M) — pulls markdown via
  `GET /objects/:id/content` with `Accept: text/markdown`.
- Pin (Cmd+Shift+P) and Unpin (Cmd+Ctrl+P).
- Open in Mymind (Cmd+Shift+Enter) and Copy mymind URL (Cmd+Shift+L)
  alongside the existing source URL actions.
- Delete (Cmd+Ctrl+X) — soft delete, recoverable for 30 days.

### Raycast AI Extension tools

- `search-mymind` — natural-language query.
- `save-url-to-mymind` — save a URL (with confirmation prompt).
- `save-note-to-mymind` — save a markdown note (confirmation includes
  a 200-char preview).
- `list-mymind-tags` — read-only tag list.
- `list-mymind-spaces` — read-only space list with object counts.

### Internals

- New `src/api/` module: `client.ts` (HMAC signer, problem+json error
  parsing), `objects.ts`, `spaces.ts`, `tags.ts`, `thumbnails.ts`, plus
  shared zod schemas with a `unwrapList` helper that tolerates both
  bare arrays and `{matches|items|...}` envelopes.
- Browse Spaces uses `GET /objects?spaceId=…` (single request) and
  Find Related uses `GET /objects?similarTo=…`, replacing the previous
  search-then-hydrate two-step.
- Object schema gains `summary`, `notes`, `blob.palette` (dominant
  color), and `entities` (extracted concepts; v0.5.0 renamed the
  singular `entity` to `entities[]`).
- New `src/api/links.ts` covering `GET /links`, `POST /links`, and
  `DELETE /links/:id`, with `linkPeerId` / `isManualLink` helpers.
- All JSON endpoints default to `Accept: application/json` (mymind
  content-negotiates and returns HTML otherwise).
- Render-layer dedupe by id in every list/grid view.
- Grid thumbnails: bytes from `GET /objects/:id/thumbnail?size=…` are
  cached on disk under `environment.supportPath/thumbnails/`, keyed by
  `id|modified|size`, fetched through a 6-wide semaphore with in-flight
  de-dup and atomic rename. Falls back to `GET /objects/:id/screenshot`
  when `/thumbnail` returns nothing usable. A 30-day mtime sweep runs
  on module load.

### Known limitations

- **Recently Deleted** is not yet shipped — the API doesn't expose a
  way to list trashed objects (only `q`, `id`, `contentAs`, `limit`).
  The `restoreObject` helper is wired and will be used as soon as
  listing exists.
- **Article reader body** isn't returned for `entityType: "Article"` —
  `/content` returns 422 and `?contentAs=text/markdown` returns
  `content: undefined`. Show Details degrades to a friendly hint.

### Dependency updates

- `@raycast/api` 1.91 → 1.104, `@raycast/utils` 1 → 2,
  `@raycast/eslint-config` 1 → 2 (flat config), `eslint` 8 → 9, `zod`
  3 → 4, `prettier` 3.3 → 3.8, `typescript` 5.4 → 5.9. `@types/node`
  and `@types/react` pinned to match the @raycast/api peer
  dependencies (22.13.10 / 19.0.10). Removed `node-fetch`. `npm audit`
  reports zero vulnerabilities.

## [Added Windows Support] - 2025-06-03

- Added support for Windows platform.

## [Initial Version] - 2025-03-17
