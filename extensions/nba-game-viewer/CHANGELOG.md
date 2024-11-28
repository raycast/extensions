# NBA Game Viewer Changelog

## [Fixes] - 2024-10-28

- Removed year from standings to default to current season.

## [Improvements] - 2024-08-28

- Added a score command that shows the scores of the games that are currently in progress and the games from the last 7 days.

## [Fixes] - 2024-08-27

- If `useLastValue` is not selected in preference, then default values for dropdown is picked from preference.
- Uses bundled heart icon from raycast instead of a custom one.

## [Improvements] - 2024-08-22

- Adds the ability to select either the NBA or WNBA league to view games, standings, and more.
- Adds a preference to store last values for league, conference etc. in drop-downs instead of default values.

## [Improvements] - 2023-11-30

- Add livescores to the Schedule view for terminated and in progress games
- Use team’s full name instead of an abbreviation for better readability

## [Improvements] - 2023-11-14

- Add the option to choose the default conference (East or West) and to view standings for the whole league.

## [Fix] - 2023-10-30

- Add a rule to set the year according to the start of the new NBA season, traditionally in October.

## [Fix] - 2023-03-12

- Fix data (wins, losses, seed) in "View Standings" command. More robustly find stats by name instead of index.
- Add a dropdown to "View Standings" command to view by conference
- Rank standings in "View Standings" command in terms of seeding.

## [Fixes] - 2023-01-08

- Fix data (wins, losses, rank) in "View Standings" command
- Fix display of weekday in "View Upcoming Games" command

## [Improvements] - 2022-08-15

- Added Cache APIs to speed up the commands.
- Visual changes to actions and lists.

## [New Feature] - 2022-06-06

- New command to view NBA headlines / news
- Notes: This is a little buggy because Raycast has trouble supporting larger text lengths. Will try and either find a workaround or wait for the bug to be fixed.

## [New Feature] - 2022-06-06

- New Addition to celebrate the beginning of the NBA 2022 Finals 🎉
- When viewing team standings you can now view the team's roster
- When viewing roster you can view player injury status and see additonal information about each player

## [Fix] - 2022-06-01

- Fixed wrong day of the week being displayed on upcoming games.

## [Initial Version] - 2022-05-19
