# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuickLinker Raycast Extension — a Raycast extension that lets users resolve their QuickLinker shortcuts directly from Raycast instead of the browser address bar. This repo contains only the Raycast extension; the backend lives in `quicklinker-web`.

## Development Commands

Once the project is initialized with `npm init` and Raycast dependencies:

```bash
npm run dev          # Start Raycast development mode (hot reload)
npm run build        # Build the extension
npm run fix-lint     # Auto-fix lint issues (Raycast ESLint config)
```

## Architecture

The extension has two commands, implemented in phases:

### Phase 1: Quick Open (`src/quick-open.tsx`)
- **No-view command** — no UI rendered, just opens a URL
- User types a shortcut name → extension calls `open(https://quicklinker.app/s/{magicKey}?q={shortcut})`
- Browser opens and QuickLinker's server performs a 307 redirect to the destination
- Magic key is stored as a `password` preference type (masked in UI, stored in macOS Keychain)

### Phase 2: Search Shortcuts (`src/search-shortcuts.tsx`)
- **List command** with Raycast's built-in fuzzy filtering
- Fetches all shortcuts from `GET /api/shortcuts/{magicKey}` (Phase 2a endpoint in quicklinker-web)
- Uses stale-while-revalidate caching in LocalStorage with 5-minute TTL
- Primary action: open URL directly in browser (bypasses redirect endpoint)
- Secondary actions: Copy URL, Copy shortcut name, Refresh (Cmd+R)

Supporting modules in `src/lib/`:
- `types.ts` — shared type definitions
- `api.ts` — fetch wrapper for the shortcuts API
- `cache.ts` — LocalStorage caching logic

## Key Technical Details

- **Magic key format**: `ql_` + 32 hex chars (regex: `/^ql_[0-9a-f]{32}$/`)
- **Redirect URL pattern**: `https://quicklinker.app/s/{magicKey}?q={shortcut}`
- **API response shape**: `{ shortcuts: [{ shortcut, url, title }] }`
- **API errors**: 400 (invalid key format), 404 (key not found), 429 (rate limited, 30 req/60s)
- **Shortcut names** are case-insensitive (lowercased server-side)

## Implementation Plan

The full implementation plan with backend context, Redis data model, rate limiting patterns, and verification steps is in `docs/raycast-extension.md`.
