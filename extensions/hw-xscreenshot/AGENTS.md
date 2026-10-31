# hw_raycast_xscreenshot

Raycast extension (Store id `hw-xscreenshot`, macOS only, MIT). "Screenshot X Post" reads the active browser tab (BrowserExtension API); if its URL is an x.com/twitter.com status, it fetches the page HTML, renders a styled card (with quoted post and thread ancestors), copies the PNG to the clipboard and saves it as `hw_raycast_xscreenshot_<timestamp>_<handle>_<id>.png` in the Save Folder (default `~/Pictures/hw_raycast_xscreenshot`, Spotlight-indexed so Raycast Search Files finds it). "Open X Screenshot Folder" opens that folder.

- `src/screenshot-x-post.ts` - the command: tab detection, HTML fetch, progress toast, clipboard (`osascript` as PNG data), HUD or result toast (After Capture preference).
- `src/parse-post.ts` - `node-html-parser` parser. Supports both X markups: the classic one (`data-testid` tweet, User-Name, tweetText, button counts, `/analytics` views link) and the new one (`x-*` classes, `data-engagement-action`, nested `<article>` for quotes). Every lookup is scoped to its own post (quoted posts are nested articles or role=link blocks holding a User-Name). The focal post is picked by status id; up to 4 earlier posts become thread parents.
- `src/render.ts` - downloads avatar/media from `pbs.twimg.com` only, writes a JSON spec and runs `/usr/bin/osascript -l JavaScript assets/render.js`.
- `assets/render.js` - draws the card with AppKit through JavaScript for Automation (no compile, no Xcode tools): a measure pass, then a draw pass at 2x. Text height comes from `NSLayoutManager` because `boundingRect` under-measures long text. The backdrop gradient samples the images' dominant hues.

The Raycast Store forbids runtime-compiled or bundled binaries and extra installs, which is why rendering uses only system `osascript`. Chromium headless is unusable (Brave, the daily browser here, does not run headless) and a WKWebView Swift tool needed the Xcode Command Line Tools, so both were dropped.

Known gaps: only the first 4 media items show; the classic-markup quote card is a heuristic (a role=link block holding a User-Name) that no real page has confirmed.

`npm run dev` loads it into Raycast. Gates: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check-render` (renders `fixtures/` post, thread and quote cases; needs network for the images). Fixtures are trimmed logged-out X markup. `npm run publish` opens the Store pull request (the operator runs it).
