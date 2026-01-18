# Caching + Background Refresh

## Overview
Add caching so data loads instantly, with background refresh to keep it fresh.

## Goals
- First render shows cached data immediately (no loading spinner)
- Data revalidates in background after mount
- Background command keeps cache warm hourly

## Cache Strategy

### Cache Keys
- `jobs:open` → open jobs list array
- `jobs:open:updatedAt` → ISO timestamp
- `pipeline:{jobId}` → { stages, applications, candidates }
- `pipeline:{jobId}:updatedAt` → ISO timestamp

### TTL
- 60 minutes target
- Stale data shown immediately, then revalidated

## UI Behavior

Use `useCachedPromise` from `@raycast/utils`:
- Provides cached `initialData` for instant first render
- Revalidates on mount and writes back to cache
- Preserve existing error handling (toasts, empty states)

## Background Refresh Command

Add to raycast manifest:
- name: `refresh-cache`
- title: `Refresh Greenhouse Cache`
- mode: `no-view`
- interval: `1h`

Behavior:
1. Fetch all open jobs
2. For each job, fetch pipeline data (stages, applications, candidates)
3. Write to cache with timestamps
4. Handle rate limits gracefully (pause/retry)

## Dependencies
- Add `@raycast/utils` for `useCachedPromise`

## Acceptance Criteria
- Jobs list renders cached data immediately on launch
- Pipeline renders cached data immediately when opened
- Data updates after background revalidation completes
- Background command runs hourly and refreshes all cached data
- Rate limit errors don't crash the background refresh
