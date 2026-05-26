# Combine OpenCode Raycast Extensions

Merge two Raycast extensions into one:
- `opencode-ext` (session inspector) — transcripts, AI summaries, metadata, copy/delete
- `opencode` (session launcher) — terminal integration, liveness detection, content search, SDK

Base project: `opencode-ext`. The other extension is dropped after merge.

## Commands

### Search Sessions (view)

The single unified command replacing both "List Sessions" and "Search Sessions".

**Two modes based on search text:**

1. **Default (empty search):** All sessions, time-grouped (Today, Yesterday, This Week, This Month, Older). Within each group, sorted by liveness first (Active > Open > closed), then recency. Project dropdown filter in search bar accessory.

2. **Search mode (≥3 chars):** Multi-word scored content search against SQLite. Flat results sorted by relevance score, no time grouping. Scoring: exact phrase in title (10), exact phrase in content (5), individual words in title (3 each), individual words in content (1 each).

**List item display:**
- Title: session title or slug fallback
- Subtitle: directory path
- Accessories: liveness tag (green "Active" / blue "Open") + relative time
- Keywords: slug, repo name, directory, session ID (for Raycast's built-in filter on top of content search)

**Action panel:**
1. Resume in Terminal (primary action) — opens or focuses existing terminal tab
2. View Transcript (push) — full markdown transcript with metadata sidebar (cost, tokens, model, files changed, share URL, timestamps)
3. View Activity (push) — todos (checkbox list) + recent messages (truncated) via SDK
4. Summarize (push) — AI-generated summary via Raycast AI (GPT-4o mini)
5. Copy Session ID
6. Copy Slug
7. Copy Transcript
8. Copy Resume Command
9. Copy Share Link
10. Open Share Link in browser
11. Open Project Directory in Finder
12. New Session (in same project directory)
13. Delete Session (with confirmation)
14. Delete All Project Sessions (with confirmation)

### New Session (no-view)

Start a fresh OpenCode conversation in a terminal. No UI — just opens the terminal.

**Arguments:**
- `directory` (text, optional) — path to open in. Falls back to `$HOME`.
- `prompt` (text, optional) — initial prompt to pass to opencode.

## Liveness Detection

Detect running opencode processes via `ps aux`, extract session IDs from `-s`/`--session` flags. Cross-reference with DB: sessions updated in last 60s or with in-progress todos are "active", others are "open". Results cached for 5 seconds.

## Terminal Integration

**Preference:** dropdown (Auto-detect, iTerm2, Terminal.app, Warp, Ghostty, Kitty). Default: Auto-detect.

**Auto-detect:** scans running processes, picks first match from priority list: iTerm2 > Kitty > Warp > Ghostty > Terminal.app.

**Resume behavior:** For open sessions, attempt to find and focus the existing terminal tab via TTY lookup. Supported for iTerm2 (AppleScript) and Kitty (remote control API). If focus fails or terminal doesn't support it, opens a new tab with `opencode -s <sessionId>`.

**New session:** Opens new tab with `cd <directory> && opencode [--prompt <prompt>]`.

**Terminal-specific implementations:**
- iTerm2: AppleScript (`create tab`, `write text`)
- Terminal.app: AppleScript (`do script`)
- Warp: AppleScript + System Events (keystroke simulation)
- Ghostty: AppleScript + System Events (keystroke simulation)
- Kitty: Remote control API (`kitty @ launch`), AppleScript fallback

## Dependencies

- `@raycast/api` (existing)
- `@raycast/utils` (existing)
- `@opencode-ai/sdk` (new — for todos and messages in activity view)

## File Structure

```
src/
├── index.tsx                      # Search Sessions command (renamed from list)
├── new-session.ts                 # New Session command (from other extension)
├── types.ts                       # TypeScript interfaces (extended)
├── utils.ts                       # Utility functions (extended)
├── components/
│   ├── SessionListItem.tsx        # List item with liveness tags (updated)
│   ├── SessionDetail.tsx          # Transcript + metadata view (kept)
│   ├── SessionActivity.tsx        # Todos + recent messages view (new)
│   ├── SessionSummary.tsx         # AI summary view (kept)
│   ├── SessionActions.tsx         # Action panel (updated with terminal actions)
│   └── ProjectDropdown.tsx        # Project filter dropdown (kept)
├── hooks/
│   └── useSessions.ts             # Data loading hooks (extended)
└── lib/
    ├── storage.ts                 # SQLite queries (extended with content search, liveness)
    ├── terminal.ts                # Terminal detection + opening (new, from other extension)
    └── clients.ts                 # OpenCode SDK client (new, from other extension)
```

## Changes to Existing Files

### package.json
- Add `@opencode-ai/sdk` dependency
- Add `new-session` command
- Rename existing command to `search-sessions`
- Add `terminal` preference dropdown
- Update metadata (title, description)

### src/index.tsx
- Replace Raycast built-in filtering with custom `onSearchTextChange` + throttle
- Add liveness sorting in default mode
- Keep time-grouping for default mode, flat list for search mode

### src/lib/storage.ts
- Add `searchSessions()` with multi-word scored search
- Add `getOpenSessions()` for liveness detection via `ps aux`
- Add `getSessionCountsByProject()` for project dropdown counts

### src/hooks/useSessions.ts
- Add `useOpenSessions()` hook
- Add `useContentSearch()` hook
- Add `useSessionTodos()` and `useSessionMessages()` hooks (SDK-based)

### src/components/SessionListItem.tsx
- Add liveness tag accessories (Active/Open)
- Change primary action to Resume in Terminal

### src/components/SessionActions.tsx
- Add Resume in Terminal as primary action
- Add New Session action
- Keep all existing copy/delete/view actions

### src/utils.ts
- Add `formatTime()` for relative time (just now, 5m ago, 2h ago, date)
- Keep existing utilities
