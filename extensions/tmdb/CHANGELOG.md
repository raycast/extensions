# TMDB Changelog

## [Add Seasons, Episodes View for TV Shows] - 2024-06-27

- Added new "Get Episode Info" command that can go into seasons and episodes for a show.
- Added a Recent Searches hook for the above search command that could be integrated with the rest of commands.
- Added the ability to set a season of a current show that is being watched to preferences, so it can be quickly jumped to from the above command.

## [Add Backdrops and Posters] - 2024-03-14

- Added new "Show Posters" and "Show Backdrops" functions for Movies and TV Shows.
- Use the dropdown filter to filter by language.
- Type in the search field within Posters or Backdrops to filter the results by dimensions.
- Open the image with `⏎`, or copy the image URL with `⌘` + `.`.
- Added "Open Homepage" action to TV Show and Movie details pages.

## [Copy Movie/TV Show ID] - 2023-12-01

- Add the ability to copy the TMDB ID of a movie or TV show to the clipboard.

## [Many improvements] - 2023-11-17

- Combine the "Search Movies" and "Search TV Shows" commands into a unified "Search" command.
- Enhance the Search command by adding a detailed screen for both movies and TV shows, including valuable information such as watch providers.
- Add an initial list of trending movies to the Search command.
- Combine the "Now Playing Movies" and "Now Playing TV Shows" commands into a unified "Now Playing" command.
- Optimize all commands by implementing caching to improve the extension's speed.
- Introduce a "Top Rated" command to discover the best movies and TV shows of all time.
- Revamp the pagination system to use `⌘` + `→` or `⌘` + `←`, instead of relying on the dropdown menu.
- Adjust the number of columns to be 5 instead of 6.
- Include the release date in the upcoming movies command.

## [Upcoming Movies] - 2023-03-24

- Add upcoming movies command.

## [UI Update] - 2023-01-02

- Updated Poster UI for movies and tv shows.
- Minor UI changes.
- Migrated to new Raycast Version.

## [Initial Version] - 2022-07-27

- Ability to search for movies and tv shows.
- Browse currently playing movies and tv shows in Grid View.
- Details for searched movies and tv shows.
- Pagination for browse views.
