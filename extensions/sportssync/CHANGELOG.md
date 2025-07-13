# Sportssync Changelog

## [Updated Game Actions with New Views] - 2025-06-04

- Created a new team details view with information about the team record, venue and more
- Created a roster view for all standings commands (except for f1). View all players and the head coach for the team, with details about experience, height, weight, and jersey numbers.
- Created a new team schedule view to view the entire season schedule
- Created a play by play view for live and completed games for all scores and schedule commands. View play by play events with time stamps during live games and after games complete. You can also see major events highlighted such as goals, saves, fights (varies based on the league).
- Created an article content view for the news view for all tracker commands. This will allow you to view articles directly from raycast without opening ESPN.

## [New Commands, Views, and Small Features] - 2025-04-21

- Created a Live Scores Menubar Command - View live scores, final scores, and games. Clicking on games will set them as the menubar title. (Must set a favorite sport and league for it to work)
- Created a Favorite Team Dashboard Command - View scheduled games, live scores, completed games, articles, injuries, transactions, standings and team info directly from one command. (Must set a favorite sport, league, and team for it to work)
- Created a Tracker Command - View articles, injuries, and transactions from one command for most leagues
- Added a "category" tooltip to tags in the article views
- Updated the news view to now show the last 50 articles (except for soccer which will show 20)
- Fixed an issue causing f1 races to show as complete when qualifying laps have been set, but races haven't been completed
- Added a "Race #" tooltip to the f1 races and schedule command
- Added country icons for every track in the f1 results and schedule command
- Combined basketball scores and schedule with college basketball scores and schedule. Also added NCAA M and W articles to the basketball tracker command.
- Renamed College Basketball Dropdowns to NCAA M and NCAA W instead of MNCAA and WNCAA for clarity
- Added Dropdown Saving - Commands will now save the last dropdown you accessed (on a per command basis).
- Globally added a new refresh action - Using the keyboard shortcut "CMD" + "R" you can refresh any command and view
- Updated action titles in every command to now be context aware (ex: it will say view Toronto Maple Leaf details instead of Team Details)
- Added a new empty view that will display when no data is found
- Added fallbacks to every api related element in every command, including links and images (should reduce the occurrence of errors)
- Refreshed the icon with some new colors
- Updated Search Bar Placeholders to be accurate for each command. They will also update when different views are selected
- Rewrote the entire code base to now be modular, easier to understand, and expand on. (Also reduced a significant amount of code)
- Added a new copy link action to the article views

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
