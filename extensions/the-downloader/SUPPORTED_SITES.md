# Supported Sites

The Downloader picks the right tool for each URL automatically.

## Videos & audio

Handled by [yt-dlp](https://github.com/yt-dlp/yt-dlp) — YouTube, Twitch, Vimeo, TikTok, X, Bilibili and hundreds more.

Full list: <https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md>

In the **Download** command you can also grab just a video's **thumbnail** image — pick the *Image* filetype.

## Image galleries

Handled by [gallery-dl](https://github.com/mikf/gallery-dl) — Reddit, Imgur, Pixiv, DeviantArt, Flickr, Instagram and hundreds more.

Full list: <https://github.com/mikf/gallery-dl/blob/master/docs/supportedsites.md>

## Music

Handled by [spotDL](https://github.com/spotDL/spotify-downloader) — paste a Spotify track, album, or playlist link and the audio is fetched from YouTube with metadata and album art.

## Webpages

Any URL that isn't a video, gallery, or music source is saved by [monolith](https://github.com/Y2Z/monolith) as a single self-contained `.html` file — every image, stylesheet, and script embedded, so the page opens offline exactly as it looked online.

## Not supported in v1

Sites that require an in-app login or OAuth sign-in are not supported in v1.

For login-gated image galleries, you can still authenticate by setting **Gallery: Cookies from Browser** in the extension preferences — gallery-dl will reuse your browser's session cookies.
