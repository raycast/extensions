# Sportssync Changelog

## [Implemented past and future scores] - 2025-03-12

- Updated the NHL Standings command to use divisions instead of conferences
- Updated each scores and schedule command to now show the scores for the past 3 days, and the games for the next 5 days
- Fixed an MLB Standings Bug causing the data to fail to display when there have been 0 GP
- Changed the MLB Scores and Schedule command to now show a short detail instead of the display clock (for more relevant information)
- Added checkmark, calendar, and x mark icons to the scores and schedule commands that change based on the game state
- Added a calendar icon to the news commands
- Added a new tag to the news commands for the article type
- Changed the F1 Results and Schedule command to show the schedule for the entire year
- Added a tag in the F1 Results and Schedule command to show the race number
- Changed the titles in the F1 Results and Schedule command to include more detail
- Added a subtitle to the F1 Results and Schedule command to show the city and country for each race
- Added a new tag in the standings commands to show whether a team is in the playoffs, or their current position in the league (varies based on the league). Includes different colors and icons that update dynamically
- Fixed a bug in the MLB Standings command causing incorrect data to display
- Added a "scheduled" tooltip for scheduled games
- Added a starting soon indicator that will display the game time in yellow and a hazard icon when a game is starting in the next 15 minutes, and until the game status becomes "live".

## [Implemented new feedback] - 2025-02-13

- Added a new league: Champions League
- Fixed an issue causing the record in nhl standings command to show up as undefined
- Added pts as a stat in the nhl standings command
- Fixed an issue causing an error when links are not available
- Updated the F1 Scores and Schedule command title: F1 Results and Schedule
- Added proper support for 4 Nations for the NHL Scores and Schedule Command

## [Initial Version] - 2025-02-12

- View upcoming games and live scores
- View up to date standings with in depth team stats
- View the news across each league
- Supported Leagues:
  - NHL
  - NBA
  - WNBA
  - Men's College Basketball
  - Women's College Basketball
  - NFL
  - NCAA Football
  - MLB
  - F1
  - English Premier League
  - LALIGA
  - German Bundesliga
  - Italian Serie A
