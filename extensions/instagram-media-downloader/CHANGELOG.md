# Instagram Media Downloader Changelog

## [Improvements] - {PR_MERGE_DATE}

- Story and highlight downloads work again. Their service can no longer be reached, so they now read the story or highlight open in your browser, through the Raycast browser extension.
- No more third-party download servers: media comes from your browser tab or from Instagram itself, so your links go only to Instagram. The README explains how.
- New Download Method preference: Browser Tab (default) or Instagram Directly, which needs no browser but may be rate-limited. For posts and reels, the other is tried next.
- Download Instagram Media now downloads stories too. While it waits, press ⌘T to open the post or story in your browser; the download comes from that tab if it loads first.
- A highlight link in Download Instagram Media or Download Instagram Story opens the highlight grid. Without the highlight open, the grid offers to open it; without the browser extension, to install it.
- Links with a username (`instagram.com/<user>/reel/…`) or without `https://` are accepted.
- Errors say what went wrong in words, and Copy Error shows what was tried, with signed links removed.
- Story and highlight files are named after the story (`story-<id>`, `highlight-<id>-1`, …).
- Downloaded files only ever get an image, video or audio extension, whatever the link says.
- In the highlight grid, Select is on ↵ alone, the saved-JSON toasts offer Show in Finder and Copy Path, and Save Selected Urls to JSON lost a malformed shortcut.

## [Improvements] - 2026-10-28

- Carousel downloads now show which item is downloading ("Media 2 of 4") with its progress, and finish with a summary of how many files were saved.
- Downloaded files are named after the post, numbered for carousels (`<shortcode>-1.jpg`, `<shortcode>-2.jpg`, …), instead of an opaque downloader ID.
- Starting a second download while one is still running (including pressing Download again in the highlight list) is now refused, instead of saving a second copy of every file.
- A download that fails partway no longer leaves a partial file behind.
- The finished-download toast offers Show in Finder and Copy Path.
- Add a Debug Logging preference for troubleshooting downloads.
- Update to Raycast API 2.9 and the latest dependencies, fixing all known vulnerabilities, including a high-severity one in `follow-redirects`.

## [Fixes] - 2026-07-04

- Improve Instagram post and reel downloads, including more reliable filename and extension detection.
- Improve story and highlight story downloads and remove the unused `cheerio` dependency.

## [Fixes] - 2026-05-11

- Fix gallery (carousel) posts intermittently failing with `401 Unauthorized` or "No media found" by retrying the GraphQL request with exponential backoff (up to 3 attempts) when Instagram rate-limits an unauthenticated caller. Also adds the `X-IG-App-ID` header and a post-specific `Referer`, both of which Instagram's web client sends.
- Add an "Open in Browser" action to the failure toast for media downloads. Loading the post in a browser first often clears Instagram's transient rate limit so that retrying the download succeeds.
- Add an explicit "Copy Error" action to all failure toasts (replacing `@raycast/utils`'s default "Report Error" action) so users always have a way to capture the failure message.
- Bump `@raycast/api`, `axios`, and dev dependencies to their latest versions; drop the unused `@raycast/utils` and the redundant `@types/cheerio` stub.

## [Update] - 2026-02-13

- Add support for downloading Instagram Reels.

## [New Features] - 2026-02-04

- Add multi-selection support for highlight stories with visual checkmark indicators.
- Add "Select All" and "Deselect All" actions.
- Add "Download Selected" action for batch downloading selected highlights.
- Add "Save Selected Urls to JSON" action for saving selected highlight URLs.

## [Maintenance] - 2025-09-08

- Add support for Windows platform.
- Bump all dependencies to the latest.

## [Update] - 2025-07-13

- Update the URL for obtaining the Instagram story.

## [New Commands] - 2025-06-16

- Added command for downloading Instagram stories.
- Added command for downloading Instagram highlight stories.

## [Update] - 2025-05-23

- Update the method for obtaining the Instagram media URL.

## [Initial Version] - 2025-05-21
