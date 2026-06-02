# Workflowy Raycast Extension — Task List

This file is the working implementation checklist for the repository.
It is derived from `plan.md` and should be updated as the project evolves.

## Source of truth

- Product/spec source: `plan.md`
- Architectural reference: https://github.com/rodolfo-terriquez/workflowy-local-mcp

## Decisions locked in

- Use `plan.md` as the API/spec source of truth.
- Attempted `better-sqlite3` first, but switched to Node's built-in `node:sqlite` because Raycast could not load native addon bindings at runtime.
- Build the stronger architecture first.
- Defer the menu bar command until the core experience is solid.
- Use a dedicated sync worker process.
- Persist a local SQLite cache under Raycast support storage.
- Store breadcrumb `path` in the `nodes` table during sync.

## Milestones

### 1. Project scaffold
- [x] Create Raycast extension manifest and TypeScript config
- [x] Add shared preferences
- [x] Add command entry points for core commands
- [x] Add placeholder icon asset
- [x] Add README with local dev instructions

### 2. Core libraries
- [x] Add preferences wrapper and validation
- [x] Add Workflowy API client wrapper
- [x] Add URL helpers for app/web links
- [x] Add SQLite cache bootstrap and schema
- [x] Add sync orchestration library
- [ ] Add richer API contract validation against live responses

### 3. Cache schema and queries
- [x] `nodes` table
- [x] `nodes_fts` FTS5 table
- [x] `tags` table
- [x] `wf_shortcuts` table
- [x] `bookmarks` table
- [x] `sync_meta` table
- [x] Add `path` column to `nodes`
- [x] Add FTS triggers
- [x] Add recent/search/incomplete/tag/bookmark query helpers
- [ ] Add preview helpers for bookmarks and shortcuts

### 4. Sync pipeline
- [x] Add `scripts/sync-worker.js`
- [x] Flatten recursive nodes-export response
- [x] Extract tags during sync
- [x] Build breadcrumb paths during sync
- [x] Replace cache atomically in one transaction
- [x] Fetch and cache Workflowy targets/shortcuts
- [x] Enforce nodes-export rate limit via cache metadata
- [ ] Add richer progress reporting from worker
- [ ] Add more defensive parsing for target/read API variations

### 5. Commands — MVP
- [x] `sync-now`
- [x] `search-nodes`
- [x] `quick-capture` (single-line no-view flow using default destination and default item type)
- [x] `quick-capture-advanced`
- [x] `add-to-today`
- [x] `complete-task`
- [x] `open-bookmark`
- [x] `browse-tags`
- [ ] Refine append-to-node UX
- [ ] Refine success/error HUDs and toasts

### 6. Command polish
- [ ] First-run onboarding screen for empty or missing API key state
- [ ] Better empty states when cache is empty
- [ ] Better stale-cache messaging
- [ ] Add node child previews where the spec calls for them
- [ ] Add bookmark creation/edit affordances beyond search actions
- [ ] Add bulk complete UX

### 7. Menu bar
- [ ] `workflowy-menu-bar`
- [ ] Today count badge
- [ ] Quick add to inbox/today from the menu bar
- [ ] Lightweight refresh strategy

### 8. Reliability and testing
- [ ] Add unit tests for flattening/path/tag extraction
- [ ] Add tests for cache mutation helpers
- [ ] Add cache corruption recovery path
- [x] Replace `better-sqlite3` with a Raycast-compatible SQLite implementation
- [ ] Evaluate whether a `sql.js` fallback is necessary beyond `node:sqlite`

## Implementation order

1. Scaffold extension
2. Preferences + API wrapper
3. SQLite schema + helpers
4. Sync worker
5. `sync-now`
6. `search-nodes`
7. `quick-capture`
8. `add-to-today`
9. `complete-task`
10. `open-bookmark`
11. `browse-tags`
12. `workflowy-menu-bar`
13. polish/tests

## Next feature proposal — View / Browse Workflowy

### Goal
Add a `view-workflowy` command that lets the user open a Workflowy location, see its children as a list, complete items, append new items, and browse deeper into the tree without opening the Workflowy app.

### Why this matters
This closes the loop after capture:
1. capture quickly
2. later open a location
3. review its contents
4. complete tasks or add more items

### Product fit
This should be a single visual command, not a fast/slow pair.
Browsing is inherently list-based, so one command is enough.

### Suggested command spec
- [x] Add `view-workflowy` command to `package.json`
- [x] Add preference for default browse target (same idea as quick capture default target)
- [x] Default open target should come from preferences, with sensible fallback to `inbox`
- [x] Show the children of the selected location as a Raycast `List`
- [x] Show current location name/path in the navigation title or subtitle

### Supported targets
- [x] system targets like `inbox` and `today`
- [x] Workflowy shortcut keys
- [x] local bookmarks
- [x] full UUIDs

### UX goals
- [ ] On open, display the chosen location's children immediately from cache when possible
- [x] Allow browsing deeper into a child node via push navigation
- [x] Keep the UI lightweight and list-first
- [x] Do not overbuild editing; focus on browse/review/common actions

### Primary actions per item
- [x] `Enter` → browse into node
- [x] `Cmd+Enter` → open in Workflowy app
- [x] `Cmd+Shift+Enter` → open in Workflowy web
- [x] `Cmd+K` → complete / uncomplete
- [x] `Cmd+Shift+A` → append child

### Location-level actions
- [x] Add new item to the current viewed location
- [ ] Switch location / open advanced picker if needed
- [x] Refresh / resync if cache is stale

### Data/access approach
- [ ] Reuse cached nodes table for children lookup via `parent_id`
- [x] Resolve target → node ID using cached shortcuts/bookmarks where possible
- [x] Add live fallback for system targets like `today` when needed
- [x] Keep optimistic cache updates for completion and append-child flows

### Non-goals for this step
- [ ] full edit forms for existing nodes
- [ ] move/delete UX
- [ ] complex inline editing

## Store-readiness checklist

### Metadata and manifest
- [x] Update `package.json` `author` to the real Raycast username/handle
- [x] Keep `license` as `MIT`
- [x] Keep `platforms` restricted to `macOS`
- [x] Keep `package-lock.json` committed
- [x] Ensure runtime icon asset exists and is not the default placeholder

### Naming and presentation
- [ ] Do one final pass on user-facing command/action naming for Apple-style consistency
- [x] Normalize product naming to `Workflowy`
- [x] Keep command set focused and non-redundant

### Build and lint
- [x] `npm run check`
- [x] `npm run build`
- [ ] `npm run lint`

### README / onboarding
- [x] Root `README.md` exists for setup and onboarding
- [x] Polish README for store-facing clarity and end-user setup flow
- [ ] Add a top-level `media/` folder if we include README screenshots or GIFs later

### Changelog
- [x] Add `CHANGELOG.md` in Raycast-compatible format
- [x] Update changelog on every meaningful store submission

### Screenshots
- [ ] Capture at least 3 screenshots
- [ ] Use Raycast metadata screenshot flow if possible
- [ ] Keep screenshots consistent in background/theme/style
- [ ] Avoid exposing any personal or sensitive data in screenshots

### Review / QA pass
- [ ] Test production build inside Raycast after `npm run build`
- [ ] Verify icon appearance in both light and dark themes
- [ ] Verify preferences onboarding feels clear
- [ ] Verify Quick Capture, Capture Item, Add to Today, Search Workflowy, View Workflowy, and Complete Workflowy Task all behave correctly
- [ ] Verify sync rate-limit messaging is user-friendly

## Notes

- Always use full UUIDs.
- Never block the UI on a full sync.
- Always update the local cache optimistically after successful writes.
- Extract tags during sync, not at query time.
- Compute breadcrumb paths during sync, not during search.
- Respect the 1/minute `nodes-export` rate limit.
- Treat Workflowy native shortcuts and Raycast local bookmarks as separate concepts.
- Current SQLite engine: Node built-in `node:sqlite` (chosen for Raycast runtime compatibility). Node docs source: https://nodejs.org/docs/latest-v22.x/api/sqlite.html
