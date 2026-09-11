# Threads Changelog

## [Fix Media Downloads and Support Share Links] - 2026-09-10

- Fix `Download Threads Media`, which had stopped working for every post. Both third-party
  services it relied on are gone — `api.threadsphotodownloader.com` no longer resolves in
  DNS, and DolphinRadar returns "Post not found" for public posts — and the resulting
  failure was reported as the misleading "No images or videos found in this Threads post".
  Media is now read from Threads directly.
- Add support for `threads.com/share/…` short links, which are resolved to the canonical
  post URL before downloading.
- Handle multi-item carousels: every image and video in a post is downloaded, each item
  independently, so one failure no longer abandons the rest.
- Download the highest-resolution version available, and name files after the post
  shortcode (`DdCYkFvlDvi.mp4`) instead of a truncated CDN path.
- Save images with the extension the server actually sent. Threads serves images as WebP
  despite the `.jpg` in the URL, so downloads were landing as `.jpg` files that were really
  WebP, which several macOS apps refuse to open.
- Write each download to a temporary file and rename it only on success, so an interrupted
  download no longer leaves a partial file that looks complete.
- Reject a response that isn't actually an image or video, time out a stalled download
  instead of spinning forever, and show progress in bytes when the size isn't known.
- Add an **Image Format** preference: keep the original WebP, or convert to JPEG or PNG
  (macOS only — conversion uses the built-in `sips`, and the original is kept if it fails).
- Add a **Debug Logging** preference that logs each step of resolution and download to the
  Raycast console, via `@chrismessina/raycast-logger`.
- Refuse to start a second download while one is already running.
- Download voice posts, which previously reported "No Media Found". They are saved as `.m4a`
  rather than the `.mp4` the server's content type claims, because the bytes are AAC audio
  with no video track.
- Add a vitest suite covering post resolution and the file-safety paths.
- Read the post out of the page's script blocks only, so a stray quote elsewhere in the
  HTML can no longer make a downloadable post look unreadable.
- Reject an empty response instead of saving a zero-byte file.
- Add a "Copy Path" action to the download-complete toast.
- Report a post that Threads refuses to serve anonymously as needing a sign-in, instead of
  the misleading "That link didn't resolve to a Threads post".
- Never overwrite an existing file. A download or conversion whose target name is taken now
  saves alongside it as `name (1).ext`.
- Redact the signed media URL in logs and in the "Copy Error" payload.
- Failure toasts now carry a "Copy Error" action.
- Update to `@raycast/api` 2.x and drop the unused `cheerio`, `node-fetch`, and `axios`
  dependencies.

## [Update] - 2025-10-21

- Update threads.net to threads.com and centeralize the base URL in constants file
- Add `View Profile` command to quickly view any user's profile
- Add `Insights` command to view account insights

## [Update] - 2025-10-14

- Add a fallback for retrieving media URLs in the `Download Threads Media` command.

## [Update] - 2025-04-28

- Updated the `Download Threads Media` command to download media from Threads.

## [Feature] - 2024-12-21

- Added the `Download Threads Media` command to download medias from Threads.

## [Initial Version] - 2024-08-21
