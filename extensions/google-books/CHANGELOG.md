# Google Books Changelog

## [Detail Sidebar, Grid Views & Code Reorg] - 2026-02-20

- feat: toggleable detail sidebar in List view showing book metadata
- feat: switchable views — List & Grid
- feat: "View Book Cover"
- feat: Allow user to add Google Books API key to avoid throttling
- refactor: reorganize code into `views/`, `actions/`, and `utils/` directories
- refactor: replace all emojis with Raycast Icon equivalents
- refactor: extract shared `BookActionSections` component for consistent actions across views
- refactor: improved API access efficiency by reducing requested data
- fix: correct singular/plural in section subtitles ("1 book" vs "2 books")
- fix: rate limiting due to API changes
- deps: update dependencies to latest versions

## [Modernize + Filter + Add CHANGELOG] - 2025-05-26

- modernize: use latest Raycast config
- feat: filter results by category
- feat: use Raycast's `useFetch` hook to benefit from some caching
- docs: add this CHANGELOG

## [Initial Version] - 2022-01-24
