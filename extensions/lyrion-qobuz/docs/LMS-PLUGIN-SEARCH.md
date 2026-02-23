# LMS Plugin Search & Playback: How It Works

This document captures how **Lyrion Music Server (LMS)** search and playback work for plugins (Qobuz, Spotify/Spotty, etc.), so we can build clients (CLI, Raycast, etc.) that search and play without relying on the web UI or fragile workarounds.

---

## 1. Overview: Two Different APIs

LMS exposes search in two main ways:

| API | Used by | Purpose | Playback from client? |
|-----|--------|---------|------------------------|
| **Plugin menu API** (e.g. `qobuz items`, `qobuz playlist play`) | Some UIs, plugin-specific menus | Browse a single plugin's menu | **No** – requires the web UI's Jive browse session |
| **Global Search API** (`globalsearch items`, `globalsearch playlist play`) | **Web UI** (Material, Default, etc.) | Unified search across My Music, Qobuz, Spotty, etc. | **Yes** – works from any client with same query + item_id |

**Use the Global Search API** for any app that needs to search and then play (CLI, Raycast, home automation, etc.). Do not rely on the plugin-specific menu API for playback.

---

## 2. JSON-RPC Basics

- **Endpoint:** `http://<host>:<port>/jsonrpc.js` (default port 9000).
- **Method:** `slim.request`.
- **Params:** `[playerId, [command, ...args]]`.
  - `playerId`: e.g. `'00:00:00:00:00:10'`.
  - Second element is an array of strings/numbers: command and its arguments.

Example:

```json
{
  "id": 1,
  "method": "slim.request",
  "params": [
    "00:00:00:00:00:10",
    ["globalsearch", "items", 0, 20, "search:beatles", "menu:jive"]
  ]
}
```

---

## 3. Plugin Menu API (e.g. Qobuz) – Why Not to Use It for Playback

### Commands

- **Browse:** `['qobuz', 'items', startIndex, count, 'search:<query>', 'menu:qobuz']` (or with `item_id:<id>` to drill).
- **Play:** `['qobuz', 'playlist', 'play', 'item_id:<id>', 'search:<query>']`.

### Limitations

1. **`qobuz items` response does not include playable identifiers**
   - You get: `id`, `name`, `type`, `image`, `isaudio`, `hasitems`.
   - You do **not** get: `url`, `play`, `passthrough`, or stable album/playlist IDs for the Qobuz API.

2. **`qobuz playlist play` does not add tracks when used from a standalone client**
   - It works in the web UI because the UI keeps a **Jive browse context** (e.g. with `menu:jive`), which the server uses to resolve the current selection.
   - From a separate client that only sends `item_id` + `search` (with or without `menu:qobuz`), the server does not add tracks; playback appears to "start" but nothing plays.

3. **Workarounds (e.g. parsing IDs from image URLs) are fragile**
   - Some clients tried to extract Qobuz album/playlist IDs from image URLs (e.g. `.../covers/.../ALBUMID_600.jpg`) and then play via `qobuz://album:ID.qbz` / `qobuz://playlist:ID.qbz`. This can work but is brittle and not a supported API.

**Conclusion:** Do not use the plugin menu API for "search then play" flows. Use **Global Search** instead.

---

## 4. Global Search API – The One to Use

This is the same API the **LMS web UI** uses for the search bar (My Music, Qobuz, Spotify, etc.). It supports both browsing and playback from any client.

### 4.1 Browsing: `globalsearch items`

**Command shape:**

```
['globalsearch', 'items', startIndex, count, 'search:<query>', 'menu:jive']
```

**Always include `menu:jive`.** This makes the server return the `actions` and `params` structures that tell you whether an item is browseable or playable.

**Optional arg:**

- **`item_id:<id>`** – Drill into a specific menu node (provider, category, artist, etc.). Omit for top-level (providers).

**Response shape:**

- **Items:** `result.item_loop` or `result.loop_loop` (array of menu items).

### 4.2 The Key Insight: `actions.go` vs `params.item_id`

With `menu:jive`, each item in the response falls into one of two categories:

#### Containers (browse deeper): items with `actions.go`

These are providers, categories, artists, and other menu nodes you drill into. They have:

```json
{
  "text": "Frank Zappa",
  "addAction": "go",
  "actions": {
    "go": {
      "params": { "item_id": "ed4c1bf8_zappa.4.1.0", "menu": "globalsearch" },
      "cmd": ["globalsearch", "items"]
    }
  }
}
```

Use `actions.go.params.item_id` as the `goId` to drill into the next level.

#### Playable leaves (albums, tracks, playlists): items WITHOUT `actions.go`

These have `params.item_id` at the top level but **no `actions` object**:

```json
{
  "text": "Hot Rats (Hi-Res)\nFrank Zappa",
  "type": "playlist",
  "icon": "/imageproxy/https%3A.../image.jpg",
  "params": { "isContextMenu": 1, "item_id": "ed4c1bf8_zappa.4.0.0" }
}
```

Use `params.item_id` as the `playId` to play with `globalsearch playlist play`.

#### Decision rule

```
if item has actions.go  → it's a CONTAINER → use actions.go.params.item_id to browse
if item has no actions.go → it's PLAYABLE  → use params.item_id to play
```

**This is the only rule you need.** No heuristics, no name-matching, no "try play first". The API structure tells you exactly what to do.

### 4.3 Example Drill-Down with Real Data

```
search: "zappa"

1. Top-level providers (no item_id):
   → Qobuz [BROWSE goId: ed4c1bf8_zappa.4]

2. Qobuz categories (item_id: ed4c1bf8_zappa.4):
   → Releases  [BROWSE goId: ed4c1bf8_zappa.4.0]
   → Artists   [BROWSE goId: ed4c1bf8_zappa.4.1]
   → Songs     [BROWSE goId: ed4c1bf8_zappa.4.2]
   → Playlists [BROWSE goId: ed4c1bf8_zappa.4.3]

3. Releases (item_id: ed4c1bf8_zappa.4.0):
   → Hot Rats (Hi-Res) · Frank Zappa     [PLAY playId: ed4c1bf8_zappa.4.0.0]
   → Sheik Yerbouti (Hi-Res) · Frank Zappa [PLAY playId: ed4c1bf8_zappa.4.0.1]

4. Artists (item_id: ed4c1bf8_zappa.4.1):
   → Frank Zappa   [BROWSE goId: ed4c1bf8_zappa.4.1.0]
   → Dweezil Zappa [BROWSE goId: ed4c1bf8_zappa.4.1.1]

5. Frank Zappa submenu (item_id: ed4c1bf8_zappa.4.1.0):
   → Releases         [BROWSE goId: ed4c1bf8_zappa.4.1.0.0]
   → Songs            [BROWSE goId: ed4c1bf8_zappa.4.1.0.1]
   → Biography        [BROWSE goId: ed4c1bf8_zappa.4.1.0.2]
   → Similar Artists  [BROWSE goId: ed4c1bf8_zappa.4.1.0.3]

6. Frank Zappa > Releases (item_id: ed4c1bf8_zappa.4.1.0.0):
   → Albums (135)                             [BROWSE goId: ...]
   → "Congress Shall Make No Law..." · Zappa  [PLAY playId: ed4c1bf8_zappa.4.1.0.0.1]
   → 200 Motels (Hi-Res) · Zappa             [PLAY playId: ed4c1bf8_zappa.4.1.0.0.2]
```

### 4.4 Playing: `globalsearch playlist play`

**Command:**

```
['globalsearch', 'playlist', 'play', 'item_id:<playId>', 'search:<query>']
```

- **`item_id`** – The `playId` from a leaf item (no `actions.go`).
- **`search`** – The **same** search query used throughout the drill-down. Must match the context.

After this, issue **`play`** to start playback:

```
['play']
```

### 4.5 Item ID Format

Opaque strings like `ed4c1bf8_zappa.4`, `ed4c1bf8_zappa.4.0`, `ed4c1bf8_zappa.4.0.0`. The hex prefix changes per session. **Always use the exact `item_id` returned** for each item and keep the **same `search:<query>`** for the whole session.

### 4.6 Display Text

Items use `text` (not `name`). Multi-line text uses `\n` as separator (e.g. `"Hot Rats (Hi-Res)\nFrank Zappa"`). Replace `\n` with ` · ` or similar for single-line display.

---

## 5. Client Implementation

### 5.1 Data Model

Each item from the API becomes:

```ts
interface SearchItem {
  goId: string;   // from actions.go.params.item_id — non-empty for containers
  playId: string; // from params.item_id (when no actions.go) — non-empty for playable items
  name: string;   // from text (with \n replaced) or name
}
```

### 5.2 Parsing Logic

```ts
function parseItem(raw): SearchItem {
  const hasGo = Boolean(raw.actions?.go?.params?.item_id);
  const goId  = hasGo ? raw.actions.go.params.item_id : '';
  const playId = hasGo ? '' : (raw.params?.item_id ?? '');
  const name = raw.text?.replace(/\n/g, ' · ') ?? raw.name ?? goId ?? playId;
  return { goId, playId, name };
}
```

### 5.3 UI Logic

```
user selects an item:
  if item.playId → call globalsearch playlist play with playId + search, then play
  if item.goId   → call globalsearch items with goId + search → show children → repeat
```

### 5.4 Do Not

- Use `actions.play` to determine playability. The Qobuz plugin does **not** set `actions.play` on albums/tracks. The absence of `actions.go` is what marks an item as playable.
- Use a single `id` field for both browsing and playing. They come from different places in the response.
- Rely on item names/labels to decide play vs. browse. The API structure is the source of truth.
- Parse image URLs or other non-API sources to get plugin-specific IDs.
- Use `item_id` from one search context with a different `search` value.

---

## 6. Quick Reference: Command Summary

| Goal | Command |
|------|--------|
| Top-level providers | `['globalsearch', 'items', 0, N, 'search:<query>', 'menu:jive']` |
| Drill into a container | Same, plus `'item_id:<goId>'` |
| Play an item | `['globalsearch', 'playlist', 'play', 'item_id:<playId>', 'search:<query>']` then `['play']` |

All via: `slim.request` with `[playerId, commandArray]`.

---

## 7. References in This Repo

- **Client implementation:** `src/lms.ts` – `SearchItem` interface, `parseItem()` (go vs play routing), `globalsearchItems()`, `searchGlobal()`, `getSubmenu()`, `play()`, `searchQobuz()`.
- **CLI flow:** `src/cli.ts` – search → pick category → `drillDown()` (if `playId` → play; if `goId` → fetch children → repeat).
