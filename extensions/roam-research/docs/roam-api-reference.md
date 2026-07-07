# Roam API Reference

Quick reference for the Roam API endpoints and queries used by this extension.

**Source files:** `roamApi.ts`, `roam-api-sdk-copy.ts`, `components.tsx`, `random.tsx`

---

## Datalog Query Catalog

Every Roam data query in the codebase:

| Name | File → Function/Constant | Purpose |
|------|--------------------------|---------|
| `BLOCK_QUERY` | `roamApi.ts → BLOCK_QUERY` | Pull pattern for rich block data: content, parent chain, refs, timestamps. Used by most read operations. |
| All pages | `roamApi.ts → getAllPagesBackend()` | `[:find ?uid ?page-title ?edit-time :where [?id :node/title ?page-title][?id :block/uid ?uid][(get-else $ ?id :page/edit-time 0) ?edit-time]]` — sorted by edit time descending |
| Back-references | `roamApi.ts → getBackRefs()` | Finds all blocks referencing a given UID (used for linked references in detail view) |
| Capability check | `roamApi.ts → detectCapabilities()` | Minimal existence test: `[:find ?e . :where [?e :block/uid]]` |
| Search full-pull | `components.tsx → searchSingleGraphFull()` | Finds blocks by UID list from Phase 1, pulls with `BLOCK_QUERY` for rich data |
| Random blocks | `random.tsx` (inline) | `(rand 50 ?block-uid)` — selects 50 random blocks that have content, a page, and at least one back-reference |

The `BLOCK_QUERY` pull pattern:
```
:block/string :node/title :block/uid :edit/time :create/time
:block/_refs
{:block/_children [:block/uid :block/string :node/title {:block/_children ...}]}
{:block/refs [:block/uid :block/string :node/title]}
```

> Note: `:block/_children` uses unbounded recursion (`...`). Deeply nested blocks will fetch the entire ancestor chain. If this causes timeouts on large graphs, consider adding recursion limits per [Datomic docs](https://docs.datomic.com/pro/query/pull.html#recursive-specifications).

---

## Append API

Used for all Quick Capture / Instant Capture operations.

**Endpoint:** `POST https://append-api.roamresearch.com/api/graph/{graph-name}/append-blocks`

```json
{
  "location": {
    "page": { "title": "Page Name" },
    "nest-under": { "string": "[[Raycast]]" }
  },
  "append-data": [{ "string": "- 14:30 Buy groceries #[[Work]]" }]
}
```

`page.title` can also be `{"daily-note-page": "MM-DD-YYYY"}` for daily notes.

Key behaviors:
- **Auto-creation:** Creates the page and `nest-under` block if they don't exist yet.
- **Nested markdown:** Since April 2025, `string` starting with `"- "` supports nested markdown natively (no `children` array needed). This is what makes our template indentation work.
- **`nest-under` disambiguation:** If a page has multiple top-level blocks matching the string, appends under the **bottom-most** match.
- **200 OK semantics:** For unencrypted graphs, capture is applied near-immediately. For encrypted graphs, 200 means "saved on Roam's servers, applied when a client next opens."

Our wrapper: `roamApi.ts → appendBlocks()` (low-level send) and `roamApi.ts → processCapture()` (template variable substitution, returns processed content). Both capture paths go through `outbox.ts → captureWithOutbox()` which calls `processCapture()` then `appendBlocks()`, logging results to the outbox.

---

## Backend API

Used for search, page lists, back-references, and capability detection.

**Endpoint:** `POST https://api.roamresearch.com/api/graph/{graph-name}/{q|pull|pull-many|search|write}`

Key details:
- **308 redirect sharding:** Roam uses CloudFront as a reverse proxy that 308-redirects to the actual peer machine hosting your graph. The SDK fork caches this peer URL to skip the redirect on subsequent requests.
- **Auth header redirect gotcha:** Most HTTP libraries drop `Authorization` on 308 redirect. The SDK sends both `Authorization` and `X-Authorization` to work around this. This is why the SDK fork is required — don't replace with the upstream npm package.
- **Query timeout:** 20-second server-side limit. 500 error with "took too long to run" if exceeded.
- **`pull-many` endpoint:** Exists but not exposed by our SDK fork. Takes `eids` (array) + `selector`. Potential optimization for batch block fetching.

Our wrapper: `roam-api-sdk-copy.ts → q()`, `pull()`, `search()`.

---

## Rate Limits & Error Codes

| API | Rate Limit | Size Limit |
|-----|-----------|------------|
| Backend API | 50 req/min/graph | Query timeout at 20s |
| Append API | 30 req/min/token, 20MB/hour/token | 200KB per request payload |

Error codes (both APIs): 200 OK, 308 redirect, 400 bad request, 401 unauthorized, 403 forbidden (Append only), 413 too large (Append only), 429 rate limited, 500 server error, 503 graph unavailable.

> **Known Roam bug:** Token verification errors sometimes return 400 instead of 401. Won't be fixed for backward compat. Our SDK error handling doesn't distinguish these.

All captures go through the **outbox** (`outbox.ts → captureWithOutbox()`), which provides automatic retry for transient failures (429, 500, 503, network errors). A background no-view command (`outbox-retry.tsx`) retries pending items every 10 minutes, up to 10 attempts. Permanent errors (401, 403, 413) are marked failed immediately. Read operations (search, page lists) have no retry logic — errors surface directly to the user as Toasts.

---

## See Also

- `docs/capture-templates.md` — How templates map to Append API payloads
- `docs/gotchas.md` — DNP UID format, `nest-under` disambiguation, rate limit gotchas
