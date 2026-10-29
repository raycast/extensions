<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="letterboxd" width="100"/>
    <h3>Letterboxd</h3>
    <p>Search movies and browse public Letterboxd details</p>
    <br/>
    <br/>
</div>

Letterboxd is a Raycast extension that searches Letterboxd's public movie catalog and shows ratings, runtime, genres, cast, and popular reviews so you can quickly open a film on Letterboxd, IMDb, or TMDB.

## Features

- Search movies by title, with paginated results and recent searches
- See posters, release year, director, runtime, genres, Letterboxd rating, and Top 250 rank in the results list
- Open a movie details view with synopsis, rating histogram, fans, cast, production companies, languages, countries, release dates, and popular review excerpts
- Open the film on Letterboxd, IMDb, or TMDB, or copy the title, URL, or Markdown link
- Mention `@letterboxd` in Raycast AI to search or fetch public movie details

No Letterboxd account is required. The extension only reads public pages and cannot access or change watchlists, diaries, ratings, reviews, or lists.

## Commands

### Search Movies

Search Letterboxd by title. You can type in the search bar or pass an optional `title` argument when you launch the command.

An empty search shows your last 8 queries so you can run them again. Opening a result or Letterboxd page records the current query.

| Action                           | What it does                                               |
| -------------------------------- | ---------------------------------------------------------- |
| Show Details                     | Opens the movie details view                               |
| Open in Letterboxd / IMDb / TMDB | Opens the film on that site                                |
| Copy Title / URL / Markdown Link | Copies the title, Letterboxd URL, or `[Title (Year)](url)` |

## Raycast AI

Mention `@letterboxd` in Raycast AI to search for movies or retrieve public details. The tools are read-only.

| Tool                         | What it returns                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Search Letterboxd Movies     | Public search results, including ratings, runtimes, genres, rankings, and Letterboxd, IMDb, and TMDB links                        |
| Get Letterboxd Movie Details | Synopsis, cast, production companies, release information, rating, and popular review excerpts for a film path returned by search |

## Disclaimer

This extension is not affiliated with Letterboxd and is not compliant with the Letterboxd Terms of Service. Use it at your own risk.

## Development

```sh
npm install
npm run dev
```

`npm run dev` starts the extension in Raycast with hot reload. Run `npm test` and `npm run lint` before publishing.

## License

MIT
