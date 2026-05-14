# Premier League Changelog

## [Endpoint Exodus] - 2025-11-05

- Upgrade to new Premier League API with cursor pagination and updated IDs.
- Merge "Fixtures" and "Results" into a single "Matches" command.
- Add match reports, improved player stats, and updated lineup/commentary components.
- Add Windows support; migrate ESLint to flat config and TS to ES2023.
- Update types and utilities to match new API structure.
- Fix edge cases.
- Remove legacy command: Manager.

## [Enhanced Data and Performance] - 2024-12-02

- Added match reports for completed fixtures, providing detailed insights into each match.
- Updated dependencies to address critical security vulnerabilities and removed unnecessary packages.
- Fixed an issue where teams with long names would not display their correct points.
- Fixed sorting issues for monthly awards.
- Corrected the position of qualification metadata and fixed issues with description map lookups.

## [Awards & Match Day Essentials] - 2024-09-28

- Added live match commentary and line-up information for each fixture, providing a more immersive experience.
- Added the "award" command to view a list of Premier League individual and team awards, including winners and statistics.
- Updated standings to always display detailed statistics, including played matches, goals for/against, goal difference, points, and form.
- Fixed incorrect player record stats by calling the API for accurate data.

## [Seamless Pagination] - 2024-09-24

- Incorporated the usePromise utility for seamless pagination, providing a more efficient and user-friendly experience.

## [Data Refinements] - 2023-02-21

- Improved accuracy and completeness of fixture and result data.
- Added more details about Premier League clubs.

## [Standings and Manager Updates] - 2023-02-03

- Included played matches, goals for/against, form, and upcoming fixtures in standings details.
- Adjusted manager image size for optimal display.

## [Visual Improvements] - 2022-06-14

- Adopted a visually appealing grid layout for better organization.
- Added descriptive metadata to list items, providing more context.

## [Core Data Introduction] - 2022-04-02

- Introduced data for clubs, players, and managers.

## [Initial Release] - 2022-03-24

- Established core functionality for standings, fixtures, and results.
