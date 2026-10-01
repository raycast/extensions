# Steam Changelog

## [Local Search, Recommendations, and New AI Tools] - {PR_MERGE_DATE}

- Fix game details showing "Game not found" for every game
- With a Web API Key, search runs from a local list of every Steam game, refreshed daily or weekly. Games stay findable by their old names after a rename
- Add a Refresh Game List action
- Show each result's icon, price, and release year, with this year's releases highlighted
- Tag games you own with your playtime, New if added in the last two weeks, and Recently Played if played in the last two weeks
- Show recently added, viewed, and played games when the command opens
- Sort My Games by name, most played, last played, recently added, or never played, and remember the sort
- Add a View Similar Games action, from Steam's More Like This list
- Add HowLongToBeat and YouTube links to game details
- Add a View Steam Profile action, and actions for most played, recently played, and recently added games
- Add settings to hide software, DLC, videos, and hardware
- Show prices in your Steam profile's currency
- Show game details beside search results with Show Details, and add a View News action to every game
- Add AI tools for similar games, recommendations from games you like or from your library, what's new on Steam, and refreshing the game list
- Add AI tools for your owned games, recently played games, and game news, and tools to launch or install a game after you confirm
- Add an Open in Steam link to game details, and open Steam directly from Steam actions instead of going through your browser
- Tell users without a Web API Key, once, that a future version will require one, and explain a rejected key
- Remove the AI game recommendation from the main view, which ran an AI request every time the command opened
- Fix an error when only one of Web API Key and Steam ID is set
- Fix My Games opening slowly with large libraries, and stop lists flashing "No Results" while they load
- Clear Recent History now clears only your recently viewed games
- Keep cached game details under 20 MB, instead of a cache that grew with every game viewed, and update to Raycast API 2

## [New Feature] - 2026-06-29

- Add a Search Users command for looking up Steam profiles
- Add a Steam users AI tool for Raycast AI queries
- Add reusable AI tools for Steam game search and game details

## [Update] - 2025-11-08

- Toggled on windows support
- Fixed some typos and deprecation warnings

## [Routine Maintenance] - 2025-08-26

- Remove the typo dependency `data-fns`
- Drop redundant `node-fetch` dependency
- Bump all dependencies to the latest

## [New Feature] - 2024-10-14

- Add support for browsing ProtonDB scores

## [New Feature & Chore] - 2024-10-07

- Add support for browsing SteamGridDB images
- Bump all dependencies to the latest

## [Add AI Recommendation] - 2023-05-23

Added an AI game recommendation to the main view

## [Bug Fixes] - 2022-09-18

Fixed a bug where when recently played games is empty, it would remain in the loading state
Removed screenshot duplication in README

## [Update] - 2022-07-14

Fixed path of the used images in README

## [Added Steam] - 2022-05-30

Initial version code
