# Greenhouse Raycast Extension - UX + Caching Spec

## Goals
- Make the extension feel faster and more polished on first open.
- Improve pipeline stage readability with stronger section headings and counts.
- Remove the extra root menu so "Greenhouse" opens the jobs list directly.
- Add background refresh so cached data is kept warm hourly.

## Non-goals
- Redesign the data model or Harvest API client.
- Add new features beyond UI polish and caching.

## UX Changes
1) Launch directly into Jobs list
- Replace the root "Jobs" menu with the Jobs list view.
- Command "Greenhouse" should open open-jobs immediately.

2) Stage presentation in pipeline
- Keep `List.Section` per stage.
- Stage heading should show the stage name and a visible count.
  - Preferred: `List.Section title="Stage Name"` and `subtitle="12"`.
  - Alternate: add a tag accessory on a first "header" item if we need stronger emphasis.
- Preserve existing days-since accessory on applicants.
- Note: Raycast does not support custom section background colors, so use titles/subtitles/accessories for emphasis.

3) Extension icon polish
- Replace `assets/command-icon.png` with the official Greenhouse logo.
- Requirements: 512x512 PNG, looks good in light/dark themes.
- Update icon references in `package.json` and `raycast.json` if needed.

## Caching + Background Refresh

### Cache strategy
- Use `Cache` for API responses (jobs list + per-job pipeline).
- Cache keys:
  - `jobs:open` -> open jobs list (array).
  - `jobs:open:updatedAt` -> ISO timestamp.
  - `pipeline:{jobId}` -> { stages, applications, candidates }.
  - `pipeline:{jobId}:updatedAt` -> ISO timestamp.
- TTL target: 60 minutes. UI may show stale data immediately and revalidate.

### UI behavior (useCachedPromise)
- Switch JobsList and JobPipeline to `useCachedPromise`.
- Read from Cache to provide `initialData` so the first render is instant.
- Revalidate on mount to refresh data and write back to Cache.
- Keep existing error handling (toasts + empty view messaging).

### Background refresh command
- Add a new command to the manifest:
  - `name`: `refresh-cache`
  - `title`: `Greenhouse (Background Hourly Update)`
  - `mode`: `no-view`
  - `interval`: `1h`
- The command should:
  1) Fetch open jobs.
  2) For each job, fetch stages + active applications + candidate details.
  3) Write results to Cache with updated timestamps.
  4) Handle rate limits or errors gracefully.
- Note: background command will appear in Raycast search unless we decide to disable it by default. Decide a friendly title (e.g., "Refresh Cache (Background)") if visibility is acceptable.

## Implementation Notes
- `src/index.tsx`: render `JobsList` directly.
- `src/jobs/JobsList.tsx`: switch to `useCachedPromise` + Cache for initial data and revalidate.
- `src/jobs/JobPipeline.tsx`: switch to `useCachedPromise` + Cache for initial data and revalidate.
- Add a shared fetch helper module (e.g., `src/jobs/harvestData.ts`) to avoid duplication between UI and background refresh.
- Add a background command entry and a new command file (e.g., `src/refresh-cache.ts`).
- Add `@raycast/utils` dependency for `useCachedPromise`.
- Keep `package.json` and `raycast.json` in sync.

## Acceptance Criteria
- Launching "Greenhouse" opens the open jobs list (no intermediary menu).
- Pipeline stages show a clear heading and count.
- Jobs list and pipeline render cached data immediately, then update after revalidation.
- Background command refreshes cached data every hour.
- Greenhouse icon is updated and meets Raycast icon requirements.
