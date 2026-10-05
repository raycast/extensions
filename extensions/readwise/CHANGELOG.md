# Readwise Changelog

## [Add Ask Readwise and update dependencies] - 2026-10-04

- Add Ask Readwise to browse library entries and summarize saved highlights and notes with Raycast AI.
- Add AI tools for paginated library and highlight retrieval, with category, library entry, and highlight date filters.
- Store AI instructions and evaluation cases in `ai.yaml`.
- Bound Ask Readwise title and author searches to five pages per request and retry rate-limited API requests within a fixed wait budget.
- Add Vitest tests; update `@raycast/api` to 2.5.3 and SWR to 2.5.1; use native fetch.

## [v1.0.1] - 2024-01-14

Fixes a typo

## [v1.0.0] - 2022-03-25

- Initial release with highlights and library search
