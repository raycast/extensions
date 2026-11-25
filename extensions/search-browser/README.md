# Search Browser for Raycast

A macOS-only Raycast companion for [Search Browser](https://searchbrowser.app/), the macOS browser. Open websites or search the web in a new tab, revisit browsing history, pins, and bookmarks, and let Raycast AI access browser data and open web destinations.

## Setup

Install [Search Browser](https://searchbrowser.app/) on macOS and launch it once. To open tabs, the extension uses System Events to send ⌘T and ⌘L to Search. If macOS blocks the shortcuts, enable Raycast under **System Settings → Privacy & Security → Accessibility** and allow the requested app controls under **Automation**.

## Commands

- **Open in Search Browser** — enter a URL to open it directly, or enter text to search the web; the destination opens in a new Search Browser tab.
- **Search History** — search your browsing history by page title or URL. Entries show their saved website icon when available and open in a new tab.
- **Search Pins** — search pinned pages by name, URL, letter, or space. Each pin displays its website favicon; open the page in Search Browser or another browser, or copy its address.
- **Search Bookmarks** — search bookmarks by name, URL, or folder, then open or copy their address.

## Raycast AI

The extension exposes browser actions as AI tools, so Raycast AI can work with Search Browser when relevant:

- **Get browser data** — read recent history, pinned pages, and bookmarks. Results include page titles and URLs, with pin space and bookmark folder context where available.
- **Open in Search Browser** — open a supplied HTTP or HTTPS URL or search phrase in a new Search Browser tab using its address bar and configured search engine.

AI access to browser data is read-only. This integration does not expose browser page contents and redacts URL credentials and common secret parameters; change or delete pins and bookmarks in Search Browser itself.

Pins and bookmarks are read from Search Browser’s local support files. These commands are read-only: add, rename, move, and remove bookmarks or pins in Search Browser itself. The lists show Personal’s bookmark store and pins for each space, plus pins shared across spaces. Press ⌘R in either list to reload the latest data. Pin favicons are loaded from the web and may take a moment to appear.

## Search engine

For text queries, **Follow Search’s default search engine** is enabled by default. The query is entered in the new tab’s address bar so Search Browser uses its configured engine. Turn this off to use the **Search Provider** dropdown instead: Google, DuckDuckGo, Bing, Ecosia, Startpage, Kagi, Brave Search, or Qwant.

URLs are opened directly regardless of the search-engine preference. Raycast extension preferences do not support conditional visibility, so the provider dropdown remains visible while the browser-default option is enabled; it is ignored until that option is turned off.

## Development

```sh
npm install
npx ray build -e dist -o dist
npx ray lint
```
