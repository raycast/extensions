# Watchlist

Search for movies and series from Raycast and keep a personal watchlist in an Obsidian Markdown file.

## Setup

1. Create or open the Markdown file you want to use in Obsidian.
2. Open the Watchlist extension preferences in Raycast.
3. Select that Markdown file for **Movies Markdown File**.
4. Run **Watchlist**. The extension creates the `Watchlist` and `Watched` sections when they are missing.

The extension preserves the rest of the Markdown file and stores entries in tables under those two headings.

## Commands

- **Watchlist**: Browse, filter, sort, rate, edit, move, remove, and open saved items.
- **Add Movie or Series**: Search Cinemeta and add a result to the watchlist or watched section.

Metadata is fetched from Cinemeta and cached locally for seven days. The extension does not require an API key or account.

## Data and Privacy

The extension reads and writes only the Markdown file you select. Search and metadata requests go to the public Cinemeta service, which provides IMDb-backed movie and series information.
