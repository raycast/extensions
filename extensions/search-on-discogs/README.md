# Search on Discogs

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-red?logo=raycast&logoColor=white)](https://raycast.com/FL0R1AN/search-on-discogs)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github&logoColor=white)](https://github.com/FL0R1AN84/search-on-discogs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A [Raycast](https://raycast.com) extension that searches for the currently playing track in the Music app on [Discogs](https://www.discogs.com).

## Features

- 🎵 Reads the artist and track name of the song currently playing in the Music app.
- 🧹 Sanitizes the query (e.g. strips `&`/`;`) for cleaner, more relevant Discogs search results.
- 🌐 Opens a Discogs search for the track in your default browser.
- 🔔 Shows a HUD confirming the search, or a friendly message if nothing is playing.

## Installation

### From the Raycast Store

Search for **Search on Discogs** in the [Raycast Store](https://raycast.com/store) and install it, or use this direct
link once it's published: [raycast.com/FL0R1AN/search-on-discogs](https://raycast.com/FL0R1AN/search-on-discogs).

### From source

```bash
git clone https://github.com/FL0R1AN84/search-on-discogs.git
cd search-on-discogs
npm install
npm run dev
```

`npm run dev` opens Raycast in development mode with the command available.

## How it works

1. Play a track in the Music app.
2. Run the **Search on Discogs** command in Raycast.
3. Your default browser opens a Discogs search for the artist and track name.

## Development

```bash
npm install
npm run dev
```

This opens Raycast in development mode and enables the command:

- `Search on Discogs` (`src/search-on-discogs.tsx`) — reads the current track and opens a Discogs search.

Other useful scripts:

```bash
npm run build      # build the extension
npm run lint        # lint the extension
```

## AppleScript / Shortcuts version

If you'd rather use this outside of Raycast (e.g. with Shortcuts or Script Editor), the standalone script is
available in [`search-on-discogs.applescript`](search-on-discogs.applescript)
([iCloud Shortcut](https://www.icloud.com/shortcuts/318cd6d2c0134c49b5774b1ada4ae0ed "iCloud Link")).

## License

[MIT](LICENSE) FL0R1AN
