# Workflowy Raycast Extension — Implementation Spec

**Version:** 1.0 (final, ready for coding agent)
**Date:** June 1, 2026
**Reference repo:** https://github.com/rodolfo-terriquez/workflowy-local-mcp

---

## 1. Goal

Build a Raycast extension for Workflowy that goes far beyond the existing community extension (`workflowy-inbox` by cameron_pak, which only captures to a single inbox location). The extension should support full-text search, capture to multiple targets, task completion, tag browsing, and bookmark navigation — all without opening the Workflowy app.

**Non-goals for v1:**
- Mirrors (not supported by the Workflowy API)
- Full offline editing
- Real-time collaboration features

---

## 2. Architecture Overview

### 2.1 The Core Problem

Workflowy has no search API endpoint. The only way to search is to download the entire account tree and query it locally. This is the same approach used in the reference MCP server repo. Once the cache is built, all search and browse operations are instant with no API calls.

### 2.2 Caching Strategy

```
Workflowy API                     Local Disk
──────────────────────────        ─────────────────────────────────────────
GET /api/v1/nodes-export   →      SQLite DB:
(full account tree dump)           ~/Library/Application Support/
(rate-limited: 1 req/min)          com.workflowy.raycast/cache.db

GET /api/llm/doc/targets/  →      Cached in sync_meta table
(user's custom shortcuts)          (refreshed on each full sync)
```

- On first launch: fetch full account → store in SQLite
- Cache stale threshold: **1 hour** (user-configurable in preferences)
- On stale: trigger background sync immediately on command open; show stale results right away, refresh when sync completes — user is never blocked
- After any write: update only the affected rows in the local cache (optimistic update); no full re-sync needed
- Sync respects the 1/min rate limit; guard with timestamp check before every export call

### 2.3 Write Operations

All writes go directly to Workflowy's LLM Doc API in real time:

```
POST /api/llm/doc/edit/
```

After each successful write, immediately update the local SQLite cache to reflect the change. Do not wait for the next full sync.

### 2.4 Authentication

- API key stored in **Raycast Preferences** (built-in secure storage, shown as password field)
- Passed as `Authorization: Bearer {apiKey}` on all requests
- First launch: extension shows an onboarding screen prompting for the API key with a link to workflowy.com/settings/

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Raycast standard |
| UI | Raycast React API | Required |
| Local DB | `better-sqlite3` | Synchronous, fast, native Node.js; easiest to work with in a Raycast extension context |
| HTTP | Node.js `fetch` | Built into Node 18+ |
| DB file location | `~/Library/Application Support/com.workflowy.raycast/` | Persists across sessions; platform-standard path |
| Auth | Raycast `getPreferenceValues()` | Secure, built-in key storage |
| Search | SQLite FTS5 virtual table | Necessary for large accounts; dramatically faster than LIKE queries |

> If `better-sqlite3` native build causes issues in the Raycast build pipeline, fall back to `sql.js` (pure JS, same approach as the reference MCP server).

---

## 4. Workflowy API Reference

### 4.1 Full Export (Cache Sync)

```
GET https://workflowy.com/api/v1/nodes-export
Authorization: Bearer {apiKey}

Response:
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",  // full UUID — always use this
      "nm": "Node text/title",
      "no": "Note content",          // optional
      "cp": 1748800000,              // completed unix timestamp; absent if not completed
      "lm": 1748800000,              // last modified unix timestamp
      "ct": 1748700000,              // created unix timestamp
      "pr": 0,                       // priority/position among siblings
      "ch": [ ...children... ]       // recursive children array
    }
  ]
}
```

Rate limit: 1 request per 60 seconds. Store last call time in `sync_meta` and enforce client-side.

### 4.2 Read Node (Live, LLM Doc API)

```
GET https://workflowy.com/api/llm/doc/read/?target={target}&depth={n}
Authorization: Bearer {apiKey}
```

`target` accepts: full UUID, system target keyword, or custom shortcut name.

**System targets:** `today`, `tomorrow`, `inbox`, `next_week`

### 4.3 List Targets (Custom Shortcuts)

```
GET https://workflowy.com/api/llm/doc/targets/
Authorization: Bearer {apiKey}

Response: array of target objects including:
- System targets (inbox, today, tomorrow, next_week)
- User-created custom shortcuts (e.g. "in" → Inbox node, "proj" → Projects node)
```

Call this during every full sync and cache the results. These are the user's native Workflowy shortcuts and should be surfaced in all destination pickers.

### 4.4 Write / Edit (LLM Doc API)

```
POST https://workflowy.com/api/llm/doc/edit/
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "ops": [
    {
      "op": "insert",
      "parentId": "550e8400-e29b-41d4-a716-446655440000",
      "text": "Node text",
      "note": "Optional note",
      "position": "top" | "bottom",
      "type": "bullet" | "todo"
    },
    {
      "op": "update",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "text": "Updated text"
    },
    {
      "op": "complete",
      "id": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "op": "uncomplete",
      "id": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "op": "move",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "parentId": "destination-uuid",
      "position": "top" | "bottom"
    },
    {
      "op": "delete",
      "id": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

> **CRITICAL:** Always use full UUIDs. Short 12-char IDs are silently accepted by the API but the operation is not executed. This is a confirmed API bug — there is no error returned. Never store or use short IDs.

---

## 5. SQLite Schema

```sql
-- Main node store
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,           -- full UUID
  name TEXT NOT NULL DEFAULT '', -- node text/title ("nm" from API)
  note TEXT,                     -- note content ("no" from API)
  parent_id TEXT,                -- parent UUID; NULL for root items
  completed INTEGER DEFAULT 0,   -- 0 = not complete; unix timestamp = completed at
  priority INTEGER DEFAULT 0,    -- sort order among siblings ("pr")
  created_at INTEGER,            -- unix timestamp ("ct")
  updated_at INTEGER             -- unix timestamp ("lm")
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent   ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_name     ON nodes(name);
CREATE INDEX IF NOT EXISTS idx_nodes_completed ON nodes(completed);

-- FTS5 for fast full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  id UNINDEXED,
  name,
  note,
  content='nodes',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with nodes table
CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(rowid, id, name, note) VALUES (new.rowid, new.id, new.name, new.note);
END;
CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, id, name, note) VALUES('delete', old.rowid, old.id, old.name, old.note);
END;
CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, id, name, note) VALUES('delete', old.rowid, old.id, old.name, old.note);
  INSERT INTO nodes_fts(rowid, id, name, note) VALUES (new.rowid, new.id, new.name, new.note);
END;

-- Tag index (populated during sync for fast tag browsing)
CREATE TABLE IF NOT EXISTS tags (
  tag TEXT NOT NULL,             -- e.g. "#project" or "@alice"
  node_id TEXT NOT NULL,
  PRIMARY KEY (tag, node_id)
);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);

-- Workflowy native shortcuts / custom targets (synced from API)
CREATE TABLE IF NOT EXISTS wf_shortcuts (
  name TEXT PRIMARY KEY,         -- shortcut name (e.g. "in", "proj")
  node_id TEXT,                  -- target node UUID; NULL for system targets
  is_system INTEGER DEFAULT 0,   -- 1 for system targets (today, inbox, etc.)
  label TEXT                     -- display name (e.g. "Inbox", "Projects")
);

-- User-defined Raycast bookmarks (separate from WF native shortcuts)
CREATE TABLE IF NOT EXISTS bookmarks (
  name TEXT PRIMARY KEY,         -- user-defined display name
  node_id TEXT NOT NULL,         -- full UUID
  note TEXT,                     -- optional context note
  created_at INTEGER
);

-- Sync and rate-limit metadata
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- Keys used:
--   'last_sync_at'       — unix timestamp of last full sync completion
--   'last_export_at'     — unix timestamp of last nodes-export API call (for rate limit)
--   'node_count'         — total nodes in cache (for display)
```

### Search Query

```sql
SELECT n.id, n.name, n.note, n.parent_id, n.completed, n.updated_at
FROM nodes_fts
JOIN nodes n ON nodes_fts.id = n.id
WHERE nodes_fts MATCH ?
ORDER BY rank
LIMIT 50;
```

### Tag Extraction (during sync)

```typescript
const TAG_REGEX = /#[\w-]+|@[\w-]+/g;
// Run on every node's name + note during the sync pass
// Insert unique (tag, node_id) pairs into the tags table
```

### Breadcrumb Path

Pre-compute during sync by walking `parent_id` chain for each node. Store as a denormalized `path` column on the `nodes` table (e.g. `"Personal > Projects > Workflowy"`) for fast display without recursive queries.

---

## 6. Commands

### 6.1 `search-nodes` — Search Workflowy

**Title:** Search Workflowy
**Description:** Search all nodes in your Workflowy account.
**Mode:** view

**Behavior:**
- On open: if cache is stale, immediately start background sync; show cached results without blocking
- Default list (no query): most recently updated nodes
- As user types: FTS5 query via `MATCH`; results update instantly
- Each result shows: node text, note preview (truncated), breadcrumb path, completed indicator

**Actions per result:**
| Shortcut | Action |
|---|---|
| `Enter` | Open node in Workflowy app (`workflowy://workflowy.com/#/{id}`) |
| `Cmd+Enter` | Open in Workflowy web |
| `Cmd+C` | Copy node text |
| `Cmd+Shift+C` | Copy Workflowy URL |
| `Cmd+K` | Toggle complete/uncomplete |
| `Cmd+Shift+A` | Append text to this node (opens sub-form) |

---

### 6.2 `quick-capture` — Quick Capture

**Title:** Quick Capture
**Description:** Add a new item to Workflowy — choose your destination.
**Mode:** view

**Form fields:**
1. **Text** (required) — node text
2. **Destination** (required, searchable dropdown):
   - Inbox *(default)*
   - Today
   - User's Workflowy native shortcuts (from `wf_shortcuts` table, ordered alphabetically)
   - User's Raycast bookmarks (from `bookmarks` table, shown after a separator)
3. **Note** (optional, collapsed — expand with `Cmd+N`)
4. **Type** (toggle): Bullet / Todo

On submit: POST to LLM Doc edit API → insert at top of destination → update local cache row → show success HUD.

---

### 6.3 `add-to-today` — Add to Today

**Title:** Add to Today
**Description:** Quickly capture a task or note to today's Workflowy node.
**Mode:** no-view (accepts text argument)

**Behavior:**
- Single text input; no destination picker — always inserts at top of the `today` system target
- Accepts text via argument for scripting/hotkey use
- On submit: POST edit → show HUD "Added to Today ✓"
- Designed to be assigned a global Raycast hotkey — fastest possible capture path

---

### 6.4 `open-bookmark` — Open Bookmark

**Title:** Open Bookmark
**Description:** Navigate to a saved Workflowy location.
**Mode:** view

**Lists two sections:**
1. **Workflowy Shortcuts** — from `wf_shortcuts` table (native, synced from API)
2. **My Bookmarks** — from `bookmarks` table (user-defined in Raycast)

Each item shows: name, context note (if any), a preview of the node's first few children.

**Actions:**
| Shortcut | Action |
|---|---|
| `Enter` | Open in Workflowy app |
| `Cmd+Enter` | Open in Workflowy web |
| `Cmd+Shift+A` | Quick-add item to this node |
| `Cmd+D` | Delete bookmark (Raycast bookmarks only; not available on WF native shortcuts) |

**Adding a Raycast bookmark:**
- Available as an action from any `search-nodes` result: `Cmd+Shift+B` → "Save as Bookmark"
- Prompts for a display name and optional note
- Saves to local `bookmarks` table

---

### 6.5 `browse-tags` — Browse Tags

**Title:** Browse Tags
**Description:** Browse all tags in your Workflowy account and the nodes that use them.
**Mode:** view

**Behavior:**
- On open: query `tags` table → show all unique tags with node counts
- Tags sorted by frequency (most used first)
- Select a tag → push a detail view listing all matching nodes with breadcrumb paths
- Actions on each node match `search-nodes` (open, copy, complete)

---

### 6.6 `complete-task` — Complete Task

**Title:** Complete Task
**Description:** Mark a Workflowy task as done without opening the app.
**Mode:** view

Identical UI to `search-nodes` but pre-filtered to incomplete nodes only (where `completed = 0`).

**Actions:**
| Shortcut | Action |
|---|---|
| `Enter` | Mark complete → update cache → show HUD |
| `Cmd+Shift+Enter` | Bulk complete selected items |

---

### 6.7 `sync-now` — Sync Cache

**Title:** Sync Workflowy Cache
**Description:** Force a full sync of your Workflowy account to the local cache.
**Mode:** no-view

**Behavior:**
- Check `sync_meta.last_export_at`; if < 60 seconds ago → show HUD "Rate limit — wait {N}s"
- Otherwise: show HUD "Syncing…" → run full sync → show HUD "Synced {N} nodes"

---

### 6.8 `workflowy-menu-bar` — Menu Bar

**Title:** Workflowy
**Description:** Today's tasks and quick capture from the menu bar.
**Mode:** menu-bar

**Menu bar icon:** Workflowy logo; badge shows count of incomplete todo items under Today node.

**Menu contents:**
```
Workflowy
─────────────────
Today's Items
  • Task one
  • Task two
  • (tap item to open in app)
─────────────────
Add to Inbox...
Add to Today...
─────────────────
Sync Now
Open Workflowy
```

---

## 7. Background Sync Architecture

Raycast extensions cannot run persistent background processes. Sync is triggered on-demand:

```
Command opens
     │
     ▼
Read sync_meta.last_sync_at
     │
     ├── Stale (> threshold)?
     │         │
     │         ▼
     │   Spawn sync subprocess    ◄── non-blocking, async
     │   (scripts/sync-worker.js)
     │         │
     │         └── On complete: update cache, refresh UI
     │
     └── Fresh? → Serve from cache immediately
```

**`scripts/sync-worker.js`** is a small bundled Node.js script (built separately from the extension) that:
1. Reads API key from env or args
2. `GET /api/v1/nodes-export` — fetches full tree
3. Flattens recursive tree to array of flat node objects
4. Extracts tags during the flatten pass (regex on name + note)
5. Extracts and builds breadcrumb paths during flatten
6. Replaces all rows in `nodes`, `nodes_fts`, `tags` atomically in one SQLite transaction
7. `GET /api/llm/doc/targets/` — fetches Workflowy shortcuts
8. Replaces `wf_shortcuts` table
9. Updates `sync_meta.last_sync_at` and `last_export_at`
10. Exits with code 0

The sync worker is spawned via `child_process.spawn` with stdio piped. Progress events (node count) are emitted via stdout for the UI to show a progress indicator.

---

## 8. File Structure

```
workflowy-raycast/
├── package.json                   # Raycast manifest, commands, preferences
├── tsconfig.json
├── src/
│   ├── search-nodes.tsx           # Command 6.1
│   ├── quick-capture.tsx          # Command 6.2
│   ├── add-to-today.tsx           # Command 6.3
│   ├── open-bookmark.tsx          # Command 6.4
│   ├── browse-tags.tsx            # Command 6.5
│   ├── complete-task.tsx          # Command 6.6
│   ├── sync-now.tsx               # Command 6.7
│   ├── workflowy-menu-bar.tsx     # Command 6.8
│   └── lib/
│       ├── api.ts                 # HTTP calls: export, read, edit, targets
│       ├── cache.ts               # SQLite init, schema, all query functions
│       ├── sync.ts                # Spawn sync worker, handle progress events
│       ├── nodes.ts               # TypeScript types for Node, Shortcut, Bookmark, Tag
│       └── preferences.ts         # getPreferenceValues() wrapper + validation
├── scripts/
│   └── sync-worker.ts             # Standalone sync script (bundled separately)
└── assets/
    └── workflowy-icon.png
```

---

## 9. Raycast `package.json` Manifest

```json
{
  "name": "workflowy",
  "title": "Workflowy",
  "description": "Search, capture, and manage your Workflowy account from Raycast.",
  "icon": "workflowy-icon.png",
  "author": "workflowy",
  "categories": ["Productivity", "Applications"],
  "commands": [
    {
      "name": "search-nodes",
      "title": "Search Workflowy",
      "description": "Search all nodes in your Workflowy account.",
      "mode": "view"
    },
    {
      "name": "quick-capture",
      "title": "Quick Capture",
      "description": "Add a new item to Workflowy — choose your destination.",
      "mode": "view"
    },
    {
      "name": "add-to-today",
      "title": "Add to Today",
      "description": "Quickly capture a task or note to today's Workflowy node.",
      "mode": "no-view",
      "arguments": [
        {
          "name": "text",
          "placeholder": "Task or note...",
          "type": "text",
          "required": false
        }
      ]
    },
    {
      "name": "open-bookmark",
      "title": "Open Bookmark",
      "description": "Navigate to a saved Workflowy location.",
      "mode": "view"
    },
    {
      "name": "browse-tags",
      "title": "Browse Tags",
      "description": "Browse all tags in your Workflowy account.",
      "mode": "view"
    },
    {
      "name": "complete-task",
      "title": "Complete Task",
      "description": "Mark a Workflowy task as done without opening the app.",
      "mode": "view"
    },
    {
      "name": "sync-now",
      "title": "Sync Workflowy Cache",
      "description": "Force a full sync of your Workflowy account to the local cache.",
      "mode": "no-view"
    },
    {
      "name": "workflowy-menu-bar",
      "title": "Workflowy",
      "description": "Today's tasks and quick capture from the menu bar.",
      "mode": "menu-bar"
    }
  ],
  "preferences": [
    {
      "name": "apiKey",
      "title": "Workflowy API Key",
      "description": "Your Workflowy API key. Find it at workflowy.com/settings/",
      "type": "password",
      "required": true
    },
    {
      "name": "cacheStaleMinutes",
      "title": "Cache Refresh Interval (minutes)",
      "description": "How often to auto-sync your account in the background. Default: 60.",
      "type": "textfield",
      "required": false,
      "default": "60"
    },
    {
      "name": "capturePosition",
      "title": "Capture Position",
      "description": "Where to insert new items within a destination node.",
      "type": "dropdown",
      "required": false,
      "default": "top",
      "data": [
        { "title": "Top", "value": "top" },
        { "title": "Bottom", "value": "bottom" }
      ]
    }
  ]
}
```

---

## 10. Critical Implementation Notes for the Coding Agent

1. **Always use full UUIDs.** Short 12-char node IDs are silently accepted by the edit API but the operation does not execute — no error is returned. This is a confirmed API behavior. Store and pass full UUIDs at all times.

2. **System targets for Today and Inbox.** Use `target: "today"` and `target: "inbox"` in the LLM Doc API — these auto-resolve to the correct node for the current date/account. Never hardcode node IDs for these.

3. **Workflowy native shortcuts vs Raycast bookmarks.** These are two separate things:
   - **WF shortcuts** (`wf_shortcuts` table): fetched from `/api/llm/doc/targets/` during sync; read-only from the extension's perspective; reflect what the user has set up in Workflowy itself
   - **Raycast bookmarks** (`bookmarks` table): created and managed within the extension; stored only locally; not synced to Workflowy

4. **FTS5 triggers.** The three triggers (`nodes_ai`, `nodes_ad`, `nodes_au`) keep the FTS index in sync automatically. When doing bulk sync replacements, drop and recreate the `nodes` table contents inside a transaction — the triggers fire per-row and keep FTS consistent.

5. **Optimistic cache updates.** After any write (insert, complete, delete), immediately write the change to the local SQLite cache. Do not wait for the next full sync. This keeps the UI feeling instant.

6. **Breadcrumb pre-computation.** During the sync flatten pass, walk each node's ancestry chain and store the result as a `path TEXT` column on the `nodes` table (e.g. `"Personal > Projects > Workflowy"`). Doing this at query time via recursive SQL is too slow for large accounts.

7. **Tag extraction during sync.** Run `/#[\w-]+|@[\w-]+/g` on each node's `name` and `note` during the sync flatten pass and populate the `tags` table. Do not compute tags at query time.

8. **Rate limit guard.** Check `sync_meta.last_export_at` before every call to `/api/v1/nodes-export`. If fewer than 60 seconds have elapsed, show a user-facing error with the remaining wait time. Never silently drop the request.

9. **Reference implementation.** The `workflowy-local-mcp` repo (https://github.com/rodolfo-terriquez/workflowy-local-mcp) is the authoritative reference for:
   - How the nodes-export response is structured and flattened
   - How the LLM Doc read/edit API behaves
   - The SQLite schema patterns and sync logic
   - Rate limit handling

10. **No mirrors.** The Workflowy API does not expose mirror nodes. Do not implement or reference mirror functionality.
