# Podcast Downloader

Search the open Podcast Index, browse episodes, copy enclosure URLs, or download audio files. A direct RSS feed URL can be pasted without any API credentials.

## Podcast Directory

[![Podcast Index](media/podcast-index.png)](https://podcastindex.org)

Directory search is powered by [Podcast Index](https://podcastindex.org), a free and open podcast directory. Searching the directory requires a free API key and secret from the [Podcast Index developer portal](https://api.podcastindex.org). Direct public RSS feed URLs work without an API key.

## Setup

1. Create free API credentials at the [Podcast Index developer portal](https://api.podcastindex.org).
2. Open the extension preferences in Raycast and enter the API key and secret.
3. Optionally choose a download folder. It defaults to `~/Downloads`.

Podcast Index credentials are only needed for directory search. You can paste a public podcast RSS feed URL into the command without configuring credentials.

## Usage

- Type at least two characters to search Podcast Index.
- Select a podcast to browse its episodes.
- Use the actions to copy the latest episode URL or download it directly.
- Paste an RSS feed URL to browse it without Podcast Index.

## Privacy

Podcast searches are sent directly to Podcast Index. RSS and episode downloads are requested directly from each podcast host. The extension does not collect analytics or send data anywhere else.
