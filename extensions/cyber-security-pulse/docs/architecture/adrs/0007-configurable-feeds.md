# 7. User-Configurable Feed Sources

## Status

Accepted

Related: makes the feed list from [0001](0001-secnews-raycast-plugin.md) editable;
reuses the preference + parsing pattern from [0004](0004-priority-watchlist.md)
and the URL safety from [0006](0006-security-hardening-for-publish.md).

## Date

2026-06-03

## Context

The feed list was a hardcoded constant. Before publishing, users need to add or
remove sources without editing code. Raycast preferences are single-line text
fields (no multiline/list type), so the list must serialize into one field.

## Decision

### Preference

Add a `feeds` `textfield` preference whose **default** is the serialized curated
set, so users start with the full list and edit it (delete entries to remove, add
`Name|url` to add). Syntax mirrors the watchlist:

- Comma separates entries.
- `Name|url` sets a display name; a bare `url` derives the name from the hostname.

Empty or all-invalid input falls back to `DEFAULT_FEEDS` (the field can never
strand the user with zero feeds).

### Parsing (`lib/feeds.ts`)

```ts
export const DEFAULT_FEEDS: Feed[];          // was FEEDS
export function parseFeeds(raw: string): Feed[];
```

`parseFeeds` validates each URL to `http(s)` (same rule as `safeUrl`), dedupes by
URL, derives missing names from the hostname, and returns `DEFAULT_FEEDS` when
nothing valid parses.

### Wiring (`lib/fetch.ts`, `latest-news.tsx`)

`fetchAllFeeds` takes the feed list as a parameter instead of importing the
constant: `fetchAllFeeds(feeds: Feed[])`. The command reads the preference and
parses inside the cached promise, keying the cache on the raw string so edits
trigger a refetch:

```ts
useCachedPromise((raw: string) => fetchAllFeeds(parseFeeds(raw)), [feedsRaw ?? ""]);
```

## Consequences

- **Easier:** users curate sources from Raycast settings; no code change, no
  rebuild.
- **Harder:** a single text field is a blunt editor for a list (no per-row UI);
  a malformed entry is silently skipped.
- **Invariants:** only `http(s)` feed URLs are fetched; an empty/invalid field
  yields the default set, never zero feeds. Per-feed fetch failures remain
  isolated (ADR-0001).
