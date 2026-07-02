# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raycast extension for Roam Research. Lets users search, quick-capture, view random notes, and create quicklinks for their Roam graphs directly from Raycast.

## Commands

```bash
npm run dev       # Start Raycast dev server (hot reload)
npm run build     # Build to dist/
npm run lint      # Lint with ray CLI (ESLint + Prettier)
npm run fix-lint  # Auto-fix lint issues
```

No test framework is configured.

## Architecture

### Entry Points (Raycast Commands)

Each file in `src/` that maps to a `package.json` command is a Raycast command entry point:

- `index.tsx` — Main graph selector/explorer
- `search.tsx` — Multi-graph search (delegates to `SingleGraphSearchView`)
- `quick-capture.tsx` — Append notes to a graph
- `random.tsx` — Random block viewer
- `new-graph.tsx` — Graph setup form (token + name)
- `create-graph-quicklink.tsx` — Raycast quicklink builder
- `manage-templates.tsx` — Capture template CRUD
- `instant-capture-default-graph.tsx` — No-view async command, captures using the designated Instant Capture template
- `outbox-view.tsx` — Capture history and pending queue browser
- `outbox-retry.tsx` — No-view background command (10min interval), retries pending captures
- `list.tsx` — Graph list rendering (shared by `index.tsx` and other commands)

### Core Modules

- **`roamApi.ts`** — API wrapper over Roam backend. Handles caching (2-hour TTL for pages), search queries (Datalog), appending blocks, back-references, and `CaptureError` classification. Exports `processCapture()` (template variable substitution) and `appendBlocks()` (low-level API call).
- **`outbox.ts`** — Capture outbox: `captureWithOutbox()` logs every capture and queues retryable failures. `retryOutboxItem()` for manual retry, `processOutboxQueue()` for background retry. Stores in encrypted `LocalStorage` (key `"outbox-items"`).
- **`roam-api-sdk-copy.ts`** — Forked copy of `@roam-research/roam-api-sdk` with modifications: uses `proxy.api.roamresearch.com` (CloudFront reverse proxy), `cross-fetch` for Node compatibility, relaxed `q()` arg types. Do not replace with the upstream package.
- **`components.tsx`** — Shared UI components: `SingleGraphSearchView`, `SelectedBlocksSearchView`, `QuickCaptureFromGraph`, `QuickCaptureForm`, and search helpers.
- **`block-detail.tsx`** — Extracted block/page detail components: `BlockDetail` (markdown rendering + metadata), `MentioningNotes` (linked references), `OpenInRoamActions`, `SelectedBlocksSearchView`.
- **`detail.tsx`** — `GraphDetail` view: graph settings screen with capability-gated command list (Search, Quick Capture, Random), onboarding, and graph management (recheck permissions, remove).
- **`utils.ts`** — Utilities including `useGraphsConfig()` hook for graph config and ordering, `useTemplatesConfig()` hook for centralized template storage, `detailMarkdown()` for Roam→GFM conversion, `todayUid()` for daily note UIDs.
- **`list.tsx`** — Graph list rendering with capabilities badge, recheck permissions, reorder, remove graph actions.

### Key Patterns

- **Two-phase search**: Phase 1 calls `roamApiSdk.search()` returning UIDs + text fast for immediate list rendering. Phase 2 runs a Datalog pull query with `BLOCK_QUERY` to load parent chain, refs, and timestamps in the background. Both use `useCachedPromise` with `keepPreviousData: true` so stale results display while fresh data loads.
- **Graph & template config storage**: `useGraphsConfig()` hook (in `utils.ts`) manages graph configs (tokens, capabilities) via encrypted `LocalStorage` (key `"graphs-config"`), and graph display order via a separate `"graph-order"` key — returns `orderedGraphNames` and `moveGraph()`. `useTemplatesConfig()` manages capture templates in a separate store (key `"templates-config"`) — returns `saveTemplate`, `removeTemplate`, `moveTemplate`. `TemplatesConfig` has an `instantCaptureTemplateId` field designating the template for Instant Capture. Pure function `getFirstTemplate()` exists for no-view async commands that can't use hooks. `resolveInstantCapture()` is a pure function that resolves template + graph for instant capture with 3-step logic: explicit designation → single-template implicit fallback → undefined.
- **Caching**: Three mechanisms: `@raycast/api` Cache (insecure LRU) for page lists (2-hour TTL) and used pages (MRU, max 20); encrypted `LocalStorage` for graph configs (tokens, capabilities), template configs, and capture outbox; `useCachedPromise` for in-memory search result caching.
- **Capture outbox**: Every capture goes through `captureWithOutbox()` in `outbox.ts`. Template variables are resolved at capture time (not retry time). On retryable failure (429, 500, 503, network), items stay "pending" and are retried by a background no-view command every 10 minutes. Permanent errors (401, 403, 413) are marked "failed". FIFO per-graph ordering preserved. Max 10 auto-retries. Synced history auto-pruned at 100 items.
- **Capabilities system**: `capabilities: undefined` means full access (backward compat for pre-detection configs). All checks use `capabilities?.X !== false`, never `=== true`. Detection runs read + append queries in parallel via `Promise.allSettled` in `detectCapabilities()`.
- **Roam markdown conversion**: Custom transform in `detailMarkdown()` converts Roam syntax (TODO/DONE checkboxes, block refs, page refs) to GitHub Flavored Markdown. Content truncated at 5000 chars to prevent UI freezes.
- **Debounced search**: 500ms debounce on search input before API calls. Minimum 2 characters required.
- **Multi-graph support**: Commands auto-select when only one graph is configured; show a picker for multiple graphs. Multi-graph search uses `Promise.allSettled` across all readable graphs, errors isolated per-graph.

### Tech Stack

- **Framework**: Raycast Extension API (`@raycast/api` v1.56, React)
- **Language**: TypeScript (strict mode, ES2021 target, CommonJS modules)
- **Roam SDK**: Custom fork in `roam-api-sdk-copy.ts` (not the npm package)
- **Formatting**: Prettier (120 char width, double quotes) + ESLint

### Documentation

**What goes where:**

- `README.md` — Public-facing for Raycast Store users only: feature list, setup guide, screenshots. No contributor/developer details.
- `CLAUDE.md` — High-level project map for LLM agents: module summaries, key patterns (1-2 lines each), tech stack, build commands. Links to deeper docs.
- `docs/*.md` — Deep-dive references for specific subsystems, optimized for LLM agents and contributors.

**Docs index:**

- `docs/capture-templates.md` — Template system: data model, resolution chain, variable substitution, CRUD, UI mapping
- `docs/roam-api-reference.md` — Datalog query catalog, Append API & Backend API reference, rate limits
- `docs/raycast-patterns.md` — Non-obvious Raycast patterns: view vs no-view, storage, navigation, forms, arguments vs preferences
- `docs/howto-extend.md` — Recipes: adding commands, GraphConfig fields, template variables, Roam queries
- `docs/gotchas.md` — Non-obvious behaviors and edge cases
**Raycast API reference:** `docs/raycast-patterns.md` covers Raycast patterns used in this extension. For the full Raycast API reference (~15K lines), see `tmp-docs/raycast-full-llms.txt`. If not present, download it:
```
mkdir -p tmp-docs && curl -o tmp-docs/raycast-full-llms.txt https://raw.githubusercontent.com/raycast/extensions/refs/heads/gh-pages/llms-full.txt
```
Only consult the full reference when working with Raycast APIs not covered by `raycast-patterns.md`.
