# Instagram Media Downloader

Download photos, videos, carousels, reels, stories and highlights from Instagram, from Raycast.

## Commands

- **Download Instagram Media**: a post, reel or story link. Carousels save every item, numbered.
- **Download Instagram Story**: a story link (`instagram.com/stories/<user>/<id>/`). Works exactly like Download Instagram Media.
- **Download Instagram Highlight Story**: a highlight link (`instagram.com/stories/highlights/<id>/`). Shows the highlight as a grid; download one story, or select several.

Download Instagram Media takes any of these links; a highlight link opens the highlight grid.

## How it gets the media

The extension reads media from one of two places, both on your own Mac:

1. **Your browser tab.** With the post, story or highlight open in your browser, the extension reads it from that tab through the [Raycast browser extension](https://www.raycast.com/browser-extension). The page already holds links to the full-size files; the extension reads them in memory and downloads the files. Only a tab showing that post or highlight is read, or, for a story, a tab on that person's stories (a playing story moves on to the next one, so the extension finds the requested story in the page). Nothing from the page is stored. This is the fastest and most reliable way, and the only way for stories and highlights, which Instagram shows only to signed-in viewers.
2. **Instagram directly.** For posts and reels, the extension can ask Instagram the same way instagram.com does for a visitor who is not signed in. No browser is needed, but Instagram limits how often a network can ask; when it says to wait, open the post in your browser instead.

The **Download Method** preference chooses which one is tried first for posts and reels; the other is tried next. Stories and highlights always come from the browser. While a download is waiting, press **⌘T** to open the post or story in a new browser tab: if the tab loads the whole page first, the download comes from the tab. Without the browser extension, the story and highlight commands offer to install it.

On Windows, where the Raycast browser extension isn't available, posts and reels download from Instagram directly; stories and highlights need macOS.

## Why no download servers

Earlier versions sent your links to third-party download services. Services like these typically ask Instagram on your behalf from many addresses and throwaway accounts, which is why they work until they are blocked, and why they tend to vanish: the story service this extension used can no longer be reached, and the post service failed most of the time while this version was being built. They also see every link you download.

Reading from your browser needs none of that: the page you already have open holds the media, it works for stories, and your links go nowhere but Instagram.

## Preferences

- **Media Download Path**: where files are saved (default: Downloads).
- **Download Method**: Browser Tab (the default) or Instagram Directly, for posts and reels.
- **Debug Logging**: detailed logs in the console, for troubleshooting.
