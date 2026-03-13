# Lega Serie A Changelog

## API Modernization - {PR_MERGED_DATE}

- Migrated standings data fetching to API v3.
- Maintained support for the older standings API for historical data spanning the 2022-23 season and backward, ensuring no disruption for older data retrieval.

## [Standings Boost] - 2024-10-10

- Updated standings to always display detailed statistics, including goals for/against, goal difference, and points.
- Enhanced code maintainability and efficiency by utilizing the `usePromise` hook for asynchronous operations.

## [Tournament Tracker] - 2023-02-21

- Added detailed club profiles, including rosters, recent matches, and club history.
- Enhanced fixtures and results page with live match status and broadcaster information.
- Introduced new sections for Coppa Italia and International Competitions, allowing users to follow Italian teams in all major tournaments.

## [Initial Release] - 2023-02-10

- Launched with core features for Serie A standings, match results, and club information.
