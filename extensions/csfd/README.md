# ČSFD Raycast Extension

A Raycast extension for searching and viewing information from ČSFD (Czech-Slovak Film Database).

## Features

- **Search Movies/TV Shows**: Quickly search for movies and TV shows in ČSFD.
- **Gallery View**: Browse movies in a visually appealing grid layout with posters.
- **List View**: Switch to list view for a more compact display of search results.
- **Detailed Views**: View comprehensive information about movies.
- **Color Ratings**: See ČSFD's color rating system directly in Raycast.
- **AI Integration**: Use Raycast AI to search for movies and get detailed information.

## Commands

### Search Movies/TV Shows

Search for movies and TV shows in the ČSFD database. View detailed information about:
- Basic information (title, year, duration)
- Ratings and scores
- Genres and origins
- Cast and crew information
- Descriptions and more

Features both grid view (with movie posters) and list view, easily toggled with ⌘T.

## AI Tools

This extension includes AI tools that allow you to interact with the ČSFD database using Raycast AI:

### Search Movies Tool

Search for movies and TV shows on ČSFD directly through Raycast AI. You can:
- Search for specific movie titles
- Find TV shows with particular keywords
- Filter content by type (movies or TV shows)
- Limit the number of results

Example: `@csfd Search for the movie Inception`

### Get Movie Details Tool

Get comprehensive details about a specific movie or TV show from ČSFD using its ID:
- Full title and year information
- Rating and color rating
- Movie poster
- Genres and country of origin
- Duration and description
- Cast and directors information
- Available streaming services

Example: `@csfd Show me details about Interstellar`

## Credits

This extension uses the [node-csfd-api](https://github.com/bartholomej/node-csfd-api) library for fetching data from ČSFD.

## License

MIT License