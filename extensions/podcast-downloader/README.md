# Podcast Downloader

Search the open Podcast Index, browse episodes, copy enclosure URLs, or download audio files. A direct RSS feed URL can be pasted without any API credentials.

## Setup

1. Create free API credentials at [Podcast Index](https://api.podcastindex.org).
2. Open the extension preferences in Raycast and enter the API key and secret.
3. Optionally choose a download folder. It defaults to `~/Downloads`.

Podcast Index credentials are only needed for directory search. You can paste a public podcast RSS feed URL into the command without configuring credentials.

## Usage

- Type at least two characters to search Podcast Index.
- Select a podcast to browse its episodes.
- Use `⌘ L` to copy the latest episode URL or `⌘ ⇧ D` to download it directly.
- Paste an RSS feed URL to browse it without Podcast Index.

## Privacy

Podcast searches are sent directly to Podcast Index. RSS and episode downloads are requested directly from each podcast host. The extension does not collect analytics or send data anywhere else.
