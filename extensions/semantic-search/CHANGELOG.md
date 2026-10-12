# Semantic Search Changelog

## [Automatic Library Updates] - {PR_MERGE_DATE}

- Add optional scheduled incremental indexing, external-power conditions, pause/resume and launcher lifetime controls. Requires companion engine 0.7.0; existing indexes are reused.

## [Photo-first visual ranking] - {PR_MERGE_DATE}

- Prefer photos over similarly matching video scenes in All Files, retaining stronger video matches and unchanged content filters. Uses companion engine 0.6.5; existing indexes need no rebuilding.

## Review Folder and Settings Edge Cases - {PR_MERGE_DATE}

- Preserve newer folder additions and deletion choices while settings requests finish.
- Explain pending source setup before removal and preserve retained/offline sources.
- Respect image-content selection while video is enabled.

## Additive Search Folders - {PR_MERGE_DATE}

- Add folders without replacing earlier sources and show the selected list.
- Remove sources with optional index cleanup, while preserving originals and remaining nested folders.
- Keep folder changes compatible with the existing database and active indexing.

## [Initial Store Release] - {PR_MERGE_DATE}

- Search local files with EmbeddingGemma 2 through a separately installed local engine.
- Manage models, folders, exclusions and incremental indexing from Search.
- Handle invalid custom service addresses without crashing setup.
- Preserve exact folder picker paths and prevent stale polling responses from resetting applied settings.
- Keep the exclusion editor current after accepted server updates while preserving unfinished local edits.

- Include optional Apple Photos/iCloud photo, video and soundtrack indexing.
- Copy Photos images at full resolution and show creation dates below previews.
- Keep completed video scenes searchable when soundtrack decoding fails.
- Reduce startup screen transitions and speed up library statistics.
- Stop obsolete Photos metadata retries when switching results, closing Search or opening Manage Library.

- Compare unchanged Photos using metadata, remember stable skips and delay temporary retries. Offer Retry Skipped Files while preserving indexed video scenes and successful entries.
