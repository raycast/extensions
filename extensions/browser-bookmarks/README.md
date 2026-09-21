# Browser Bookmarks

Integrate bookmarks from Brave, ChatGPT Atlas, Chrome, Edge, Firefox, Safari, Arc, Sidekick, Vivaldi, Prisma Access, Perplexity Comet, Dia, Ghost Browser, or Helium.

## Configuration

The extension retrieves bookmarks from two sources: your browsers and their profiles. The default browser is enabled by default, while the others are disabled. You can enable them using the `Select Browsers` action (`⌘` + `⇧` + `S`). This will directly get your bookmarks.

On Windows, the first supported browsers are:

- Chrome
- Edge
- Brave

Chromium bookmarks are automatically refreshed when the selected profile's bookmark file changes.

## Opening Bookmarks

- `Enter` opens the bookmark normally. Enable `Replace Current Browser Tab` to reuse the active tab in supported macOS browsers when `Open Bookmark's Browser` is enabled.
- On macOS, `⌘` + `Enter` explicitly opens it in a new tab in the browser it came from.
- On macOS, `⇧` + `Enter` opens it in a new window in Safari or supported Chromium browsers (Brave, Chrome, Edge, and Vivaldi variants).
- On Windows, bookmark opening keeps the extension's previous standard behavior.

For Chromium browsers, the extension reads cached favicons from the selected local browser profile. Favicons that already have a background are preserved; transparent marks receive a contrasting background. Local addresses without a cached favicon use a generic network icon and are not sent to a remote favicon service.

If you have multiple profiles, you can select the one you want from the enabled browsers:

- ChatGPT Atlas `⌘` + `⇧` + `G`
- Brave: `⌘` + `⇧` + `B`
- Chrome: `⌘` + `⇧` + `C`
- Dia: `⌘` + `⇧` + `D`
- Edge: `⌘` + `⇧` + `E`
- Firefox: `⌘` + `⇧` + `F`
- Helium: `⌘` + `⇧` + `H`
- Arc: `⌘` + `⇧` + `A`
- Vivaldi / Vivaldi Snapshot: `⌘` + `⇧` + `V`
- Prisma Access: `⌘` + `⇧` + `P`
- Perplexity Comet: `⌘` + `⇧` + `O`
- Whale: `⌘` + `⇧` + `W`
- Zen: `⌘` + `⇧` + `Z`
