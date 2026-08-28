# letterboxd Changelog

## [Enhancements] - 2026-08-23

- Added paginated movie search with recent searches and clearer empty states
- Added ratings, runtimes, Top 250 positions, genres, and IMDb/TMDB actions to search results
- Added cast, production companies, languages, countries, and exact release dates to movie details
- Added read-only AI tools for movie search and detailed public movie information
- Improved cache recovery, request retries, number formatting, parser coverage, and dependency compatibility

## [Fix] - 2026-07-27

- Fixed movie search after Letterboxd retired the previous search endpoint
- Use Letterboxd's JSON search response for posters, release years, and directors
- Keep movie details available when optional statistics endpoints are blocked

## [Fix] - 2026-04-23

- Fixed the issue with the rating histogram not working

## [Fix] - 2026-04-06

- Fixed genre tag color for better visibility in light mode

## [Maintenance] - 2026-02-07

- Add support for Windows platform
- Bump all dependencies to the latest
- Update to use fetch instead of got

## [Fix search movies not working] - 2025-09-15

- Fix the issue with the search movies not working
- Fix the issue with the movie details not displaying data

## [Fix show movie details not working] - 2025-08-04

- Fix the issue with the movie details not working

## [Add movie runtime information] - 2025-04-10

- Add runtime information to the movie details panel

## [Fix the issue with the emoji substring] - 2024-11-01

- Fix the issue with the review content emoji substring that causes an error

## [Fix search movie not working] - 2024-10-04

- Fix the issue with the movie search not working

## [Initial Version] - 2024-02-01

- Can search for movies and view details about them
