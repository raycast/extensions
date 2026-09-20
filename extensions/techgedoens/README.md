# Techgedöns.de

Read and search Techgedöns from Raycast. The extension uses the public RSS feed at tchgdns.de.

## Commands

- **All Articles** - Opens the searchable local article archive with independent topic and read-status filters.
- **Ask Techgedöns** - Answers questions from matching archived articles with Raycast AI and links the sources used.
- **Favorites** - Collects saved articles in a dedicated read-later list.
- **Latest Articles** - Shows the latest nine articles in a compact numbered list.
- **Open Techgedöns.de** - Opens the website directly in the default browser.
- **Refresh Articles** - Updates the latest articles and the local archive manually or through Raycast Background Refresh.
- **Search Techgedöns** - Searches all published articles in the public Techgedöns.de blog archive.

## Additional Features

- Full-text search across the local archive and the complete public blog archive
- Article previews with images, publication dates, topics, and rendered article content
- Read, unread, and favorite status with an unread count in Raycast root search
- Configurable Return key action for reading in Raycast or opening the default browser
- Open articles with another app or copy their links
- Configurable initial filter, archive retention, and number of articles loaded per page
- Infinite scrolling and independent topic and read-status filters
- Favorites remain stored regardless of the selected archive retention period
- Automatic hourly background refresh with the latest update status shown in Raycast
- English interface by default with an optional German command interface

## Language

English is the default. Select **Deutsch** under **Settings → Extensions → Techgedöns.de → Language** to use German inside command views. Raycast currently exposes extension names, command names, arguments, and preference labels in US English only, so those labels cannot switch dynamically.

## Local Development

1. Open this folder in Terminal.
2. Run `npm install`.
3. Run `npm run dev`.
4. Search for **Latest Articles** in Raycast.

Open **All Articles** for the complete local archive. On first launch, it loads RSS pages up to the configured retention limit. The Return key action, initial article filter, retention period, page size, and interface language can be configured under **Settings → Extensions → Techgedöns.de**.

## Background Refresh

Run **Refresh Articles** once or enable Background Refresh in that command's Raycast settings. Raycast will then run it silently about once per hour. The command subtitle shows the last successful refresh time or a failure state. Scheduling is controlled by Raycast and the operating system, so the exact time can vary.

## Data Source

The article lists use only the public RSS feed at `https://tchgdns.de/feed/`; no credentials are required. Ask Techgedöns sends the question and excerpts from matching public articles to Raycast AI, which must be available for the user's Raycast account.
