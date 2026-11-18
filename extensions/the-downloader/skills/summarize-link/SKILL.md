---
name: summarize-link
description: Summarize a link — a video (YouTube, TikTok, X, Vimeo…), a social post (Instagram, Reddit…) or a web article — from its transcript, caption or text. Use when someone shares a link and wants a summary, TL;DR, recap or the key takeaways.
---

# Summarize a link

1. Call The Downloader's `read-link` tool with the URL. For a video, pass `language` only when the person asks for a specific caption language.
2. Read the whole result: the facts at the top (title, author or channel, site, date, statistics, chapters) and the body — a video's timestamped transcript lines `[m:ss] …`, a post's caption, or an article's text.
3. Write the summary in this shape:
   - **One or two sentences** on what it is and who it's for.
   - **Key points**: 5–10 bullets in the order they come up. For a video, start each with the timestamp where it's discussed, as a link, e.g. `[4:05](https://www.youtube.com/watch?v=ID&t=245s)` — the tool output shows the link format for that site. For a post or an article, no timestamps; quote a short phrase where it helps.
   - **Takeaway**: one line on the most useful thing to remember.
4. Follow a video's chapters or an article's sections when it has them.
5. Keep names, numbers and claims exactly as given. Don't add facts the source doesn't contain; if you add context of your own, say so.
6. If the body isn't available (no captions, a login wall, a JavaScript-only page), say so, then summarize from the title, description and details and make clear that's all you had.

Reply in the language the person wrote in, even when the source is in another language.
