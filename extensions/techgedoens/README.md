# Techgedöns.de

Read and search Techgedöns from Raycast. The extension uses the public RSS feed at tchgdns.de.

## Commands

- **All Articles** - Opens the searchable local article archive with independent topic and read-status filters.
- **Favorites** - Collects saved articles in a dedicated read-later list.
- **Latest Articles** - Shows the latest nine articles in a compact numbered list.
- **Open Techgedöns.de** - Opens the website directly in the default browser.
- **Refresh Articles** - Updates the latest articles and the local archive manually or through Raycast Background Refresh.
- **Search Selected Text** - Searches the public blog archive for text selected in the frontmost application.
- **Search Techgedöns** - Searches all published articles in the public Techgedöns.de blog archive.
- **Techgedöns Menu Bar** - Optionally shows the unread count, configurable latest articles, and favorites in the macOS menu bar.

## Additional Features

- `@Techgedöns` AI extension for searching the archive, retrieving the latest posts, and loading complete articles in Raycast AI
- Full-text search across the local archive and the complete public blog archive
- Search the public blog archive directly using text selected in another application
- Article previews with images, publication dates, topics, and rendered article content
- Read, unread, and favorite status with an unread count in Raycast root search
- Configurable Return key action for reading in Raycast or opening the default browser
- Open articles with another app or copy links with optional titles, summaries, and Markdown formatting
- Configurable initial filter, archive retention, and number of articles loaded per page
- Infinite scrolling and independent topic and read-status filters
- Favorites remain stored regardless of the selected archive retention period
- Automatic hourly background refresh with the latest update status shown in Raycast
- Optional menu bar mode with 3, 5, or 10 articles per section, an unread-only filter, a hideable zero counter, a dedicated favorites section, configurable date and category details, and shortcuts to the main lists
- US English command interface with the original German blog topics

## Local Development

1. Open this folder in Terminal.
2. Run `npm install`.
3. Run `npm run dev`.
4. Search for **Latest Articles** in Raycast.

Open **All Articles** for the complete local archive. On first launch, it loads RSS pages up to the configured retention and safety limits. The Return key action, initial article filter, retention period, and page size can be configured under **Settings → Extensions → Techgedöns.de**.

## Background Refresh

Run **Refresh Articles** once or enable Background Refresh in that command's Raycast settings. Raycast will then run it silently about once per hour. The command subtitle shows the last successful refresh time or a failure state. Scheduling is controlled by Raycast and the operating system, so the exact time can vary.

## Data Source

The article lists and AI tools use only the public RSS feeds at `https://tchgdns.de/`; no credentials are required. `@Techgedöns` sends the content of up to five matching public articles to Raycast AI, which requires Raycast Pro.
