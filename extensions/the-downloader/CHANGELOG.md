# The Downloader Changelog

## [Markdown Pages, Recent Links and More Video Options] - {PR_MERGE_DATE}

- **Webpages as Markdown** — a third Save Mode next to Complete and Lightweight: the article's text, links, images, lists, code and tables as one `.md` file, with the title, source, author and dates on top for notes apps such as Obsidian. It needs no monolith, and when monolith is missing the set-up screen offers it.
- **Playlists and Channels** — a playlist or channel link lists its videos in the form: pick the ones you want, or leave it empty for all of them. They are saved into a folder named after the playlist, numbered in its order, and the live view shows which video it is on (2 of 5). A playlist with a private or deleted video still saves the rest and says what was left out.
- **Clip** — download only part of a video or its audio: `1:30-2:45`, `90-120` or `1:30-` (to the end). The cut is exact, and the file's name carries the clip's times.
- **Subtitles** — put a caption track the video has inside the file, or save it next to the video as `.srt`.
- **Copy Page as Markdown** (⌘⇧C in the form) — the article on the clipboard instead of in a file. Saving or copying a page that blocks apps (HTTP 403, 429) or is gone (404, 410) uses the Internet Archive's latest copy and says so, in the toast and in the file's front matter.
- **Fast Download Without a URL** — takes the link in your clipboard, or the browser tab you're on, so it works from a hotkey.
- **Download History** — export the list as CSV or JSON, remove the entries whose files are gone, and see each day's total size.
- **Recent Links** — type `@` in Raycast AI Chat and choose Recent Links to mention a link you downloaded or chatted about. Its transcript, caption or article is attached to the message, from the same cache Chat About Link and `read-link` use.
- **Video: Metadata** — optionally write the title, channel, date and chapters into the file, with the thumbnail as cover art.
- **Video: SponsorBlock** — optionally cut sponsored segments out of YouTube downloads.
- **Video: Browser Cookies** — optionally give yt-dlp the browser chosen under Cookies from Browser, for age-restricted, private or members-only videos. The Custom Browser Spec takes a Firefox container (`firefox::Work`).
- **FLAC and WAV** audio for videos, next to MP3, M4A and Opus.
- **Filetype Checked Against the Link** — the form asks yt-dlp what each link holds and offers only what it can give: no Video for an audio-only track, no Audio for a silent clip, no Transcript without captions, no Image without a thumbnail, and only Website for a page with no media (a Wikipedia article, say), whatever the site. A webpage with a video also offers Image and Transcript. The Filetype info says what was left out and why; a link yt-dlp can't read for another reason shows why, and the download can still be tried.
- **Raycast AI Model** — GPT-6.2 Sol joins the list.
- **Fixes**
  - Force IPv4 now applies to the download, the thumbnail and the transcript, not only to the preview.
  - A download folder with `%` in its name works, and very long titles no longer exceed the file-name limit.
  - A playlist or channel link shows its first video's details right away instead of reading every entry first.
  - Stop during the merge step also removes the downloaded streams and the half-written file.
  - A long conversion to MP3 or a big merge is no longer stopped as "stuck"; a huge Network Idle Timeout no longer stops every download at once.
  - A failed download's toast shows the error itself instead of pages of warnings; a gallery that failed part-way says how many files were saved.
  - A link pasted or copied with a trailing space or line break is accepted in Download, Fast Download and the clipboard auto-load.
  - Pressing Download while one is running returns to its live view instead of covering its Stop button.
  - Chat About Link: a question asked while the saved chat was loading can't replace it; an older load can't overwrite a newer one; an X post without a video is read as a post; nested lists keep their parent items; Chinese, Japanese and Thai questions find the matching passages; Wikipedia pages get their real title.
  - Ollama: an address typed without `http://` works, and an embedding model is no longer picked as the default.
  - On Windows, tool output is read as UTF-8 and no console window flashes up for each tool run.
  - Stopping or timing out a video's details ends everything yt-dlp started (its deno; on Windows the Python behind `yt-dlp.exe`), not only yt-dlp itself.
  - Chat About Link asks before it stops a running download: it opens in place of the Download command.
  - A summary of a very long video on a small model (Apple Intelligence) merges its notes first instead of cutting each to a few words; an empty model answer shows as an error instead of an empty reply.
  - Images for the AI are recognized by their content, so a JPEG served as `image/jpg` is read and an SVG or an error page is skipped.
  - Pages made mostly of scripts, or with an endless feed, are read in a fraction of the time.
  - Download History notices a file moved or deleted while it's open.
  - Spotify downloads work into a folder with `{` or `}` in its name.
  - A tool path preference set to the folder instead of the program uses the program inside it.
  - An error from a tool too old for an option says to update it; a failed update isn't offered again before every download.
  - Download History shows why it couldn't be read, with Try Again, instead of looking empty, and checks for missing files without slowing the list.
  - Transcript downloads use Video: Browser Cookies too, so a members-only video's captions can be saved.
  - The links in this extension's Store page lead to its guides on GitHub instead of a missing page.
  - Stopping a Markdown save shows Cancelled instead of a failure.
- gallery-dl's links point to Codeberg, where its development moved.
- Updated to Raycast API 2.14 (the Node.js 26 runtime), execa 10 and TypeScript 6.

## [Initial Release] - 2026-10-29

Download videos, audio, image galleries, Spotify music and complete webpages from Raycast, and chat with AI about any video, post or article. The Downloader started from [Video Downloader](https://www.raycast.com/vimtor/video-downloader) by vimtor and its contributors.

- **Download** — paste a link and The Downloader picks the tool: yt-dlp for video and audio, gallery-dl for image galleries, spotDL for Spotify, and monolith for complete webpages saved as one `.html`. Transcripts and thumbnails too. Once a link is read, the form shows the channel, duration, views and best quality, with an estimated size for every quality; Media Preview (⌘Y) shows the thumbnail, description and formats.
- **Live download view** — a progress ring, speed, time left, size, a speed chart and the steps (Prepare → Video → Audio → Merge → Saved). Stop Download is the first action; Esc returns to the form while the download continues in a toast.
- **Fast Download** — a link as the command's argument, downloaded right away with your saved defaults.
- **Download History** — everything downloaded, grouped by day, searchable and filterable by type, with Open File, Show in Finder, Download Again and Remove.
- **Chat About Link** — ask anything about a video (its timestamped transcript, chapters and statistics; answers link to the moment), a social post or an article. Use Raycast AI, Apple Intelligence (macOS 27, on-device) or a local Ollama model, with Answer Style, Answer Language and Custom Instructions. Chats are saved, and when a page blocks apps or is gone, you can read the Internet Archive's copy.
- **Raycast AI Chat** — Download Video, Read Link and Get Link Info tools, plus the Summarize Link, Study Notes and Performance Check skills.
- **Setup and updates** — missing tools install through Homebrew (macOS) or winget (Windows), and outdated ones are offered an update before a download. spotDL's prebuilt binary comes from its GitHub releases and is checked against its SHA-256.
- **Privacy** — links are validated before any tool sees them, the page reader and the AI download tool never reach your local network, browser cookies are used only when you pick a browser, and the auto-downloaded or Homebrew spotDL gets the Spotify client secret from a private config file rather than its command line (falling back to the command line only when that file can't be written).
