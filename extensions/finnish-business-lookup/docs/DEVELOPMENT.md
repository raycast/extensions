# Development Guide

This guide covers how to develop and maintain this Raycast extension.

## Tech and Runtime

- TypeScript + React (TSX)
- `@raycast/api` and `@raycast/utils`
- Bun package manager in this repository
- Raycast-managed Node runtime when command executes

## Project Layout

- `src/prh-search.tsx`: root command (`prh-search`)
- `src/components/company-detail.tsx`: detail screen
- `src/api/prh.ts`: API client (`GET /companies`)
- `src/hooks/use-prh-search.ts`: input classification + search orchestration
- `src/lib/language.ts`: language preference + fallback order
- `src/lib/detail-view.tsx`: split-view right-panel render helpers
- `src/lib/maps.ts`: map search-link construction from PRH address fields
- `src/lib/search-ranking.ts`: name-query relevance ranking
- `src/lib/selectors.ts`: PRH -> UI selection logic
- `src/lib/format.ts`: formatting helpers
- `src/types/prh.ts`: raw API types
- `src/types/ui.ts`: UI-level types
- `src/constants.ts`: app constants and mappings

## Local Workflow

Run from repository root:

```bash
bun install
bun run dev
bun run lint
bun run build
```

Useful CLI commands:

```bash
bunx ray help
bunx ray migrate
```

## Coding Rules

- Keep logic modular and testable.
- Keep data fetching inside `src/api/`.
- Keep transformation and selection logic inside `src/lib/`.
- Keep command components focused on UI orchestration.
- Prefer Raycast-native patterns for navigation and actions.

## Raycast UI Guidelines (Applied Here)

- Action titles in Title Case.
- Always provide a meaningful search placeholder.
- Use `Action.Push` for nested views.
- Show loading state during async work.
- Avoid empty-state flicker by gating render on loading state.

## Query and API Safety

Current enforced behavior:

- Never call `/companies` with empty input.
- Input classification:
  - `^\d{7}-\d$` -> business ID
  - `^\d{8}$` -> normalize to `NNNNNNN-N`, then business ID
  - text length >= 3 -> name search
  - other numeric values -> show hint, skip API call
- Pagination is supported via incremental page loading.

## Search Performance Strategy

`use-prh-search` implements stale-while-revalidate:

- Cache key format:
  - `b:{businessId}:p:{page}` for Business ID queries
  - `n:{lowercaseName}:p:{page}` for name queries
- Cache policy:
  - TTL: `120000ms` (120s)
  - Retention: `86400000ms` (24h)
  - Max entries: `100`, oldest entries evicted first
- Behavior:
  - fresh cache => immediate render, skip network
  - stale cache => immediate render + background refresh
  - no cache => normal network fetch
- Cache persistence:
  - cache is mirrored to local storage key `prh-search-cache-v2`
- Name queries are debounced (`180ms`)
- Business ID queries remain immediate
- Pagination:
  - page 1 is searched first
  - additional pages are loaded on demand
- Request dedupe:
  - identical in-flight requests share one underlying fetch
- Request race protection:
  - `AbortController` cancellation
  - monotonic request token guard before state writes

## Split-View + Detail Fetch Strategy

- Search results view uses Raycast `List` split detail mode.
- Left pane remains compact for scanning.
- Right pane stays minimal and prioritizes dates (last modified, registration, end date), then key status fields.
- `CompanyDetail` conditional refetch:
  - skip refetch when `initialCompany` already has critical data
  - preserve fallback UI and toast behavior on errors

## Data and Security Notes

- No external analytics.
- No opaque binary dependencies.
- Keep stored local data minimal.
- Search cache is stored locally for query performance.

## Store Publishing

Before opening the Raycast Store publish PR:

1. Confirm package metadata, icon, screenshots, changelog, README, and attribution are current.
2. Run Bun validation (`bun install --frozen-lockfile`, `bun run lint`, `bun run build`).
3. Run npm validation (`npm ci`, `npm run lint`, `npm run build`) because Store review uses the npm lockfile path.
4. Follow the publish checklist in `docs/STORE_SUBMISSION.md`.

## Suggested Improvements

- Add `bun run check` script (`lint && build`)
- Add optional language override preference
- Add phone/email only if PRH (or another explicitly approved source) provides reliable contact fields
