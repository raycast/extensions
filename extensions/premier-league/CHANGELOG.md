# Premier League Changelog

## [Move Jump to Matchweek off Enter] - 2026-08-31

- Move the "Jump to…" shortcut from `Enter` to `J`. `Enter` already opens Match Commentary on the selected match, so the two were competing.
- Submit the matchweek form with `Enter` once a number is typed, rather than `Cmd+Enter`.

## [Split Matches and Fixtures] - 2026-08-30

- Add a Fixtures command covering matches in progress and still to come. Matches now holds completed games only, so a match moves from one command to the other at the final whistle.
- Show the live clock on matches in any half, not only on ones the feed marks with a short code.
- Restore scrolling to load more, now in the direction each command is about: Matches works back through earlier matchweeks, Fixtures works forward through later ones.
- Add a "Jump to…" action on both commands for moving straight to a matchweek, on `Enter`. The field starts on the matchweek you are viewing and only accepts 1 to 38, so there is nothing to get wrong.
- Rename the matchweek actions to "Next: Matchweek n" and "Previous: Matchweek n". Each command starts with only the action that keeps you on its side of today, and offers the other one once you have moved.

## [Matchweek Navigation] - 2026-08-26

- Fix Matches loading fixtures from the earliest seasons on record while the current season was still resolving.
- Land on the upcoming matchweek instead of the one the gameweek config reports, and list the previous matchweek above it until the upcoming one kicks off.
- Fetch a whole matchweek in one request. Scrolling no longer pulls in more matches or repeats fixtures already on screen.
- Rename the matchweek actions to "Next Matchweek (n)" and "Previous Matchweek (n)", and bind them to `]` and `[`.

## [Fix Season Rollover] - 2026-08-21

- Fix Matches, Table, Clubs and Squad showing the previous season once a new one kicks off. The season list the extension reads can trail the season it describes by months, so from July the active season is now read from the API and merged into that list.

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
