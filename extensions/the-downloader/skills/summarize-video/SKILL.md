---
name: summarize-video
description: Summarize an online video (YouTube, Vimeo and other sites yt-dlp supports) from its transcript, with key points linked to the moment they happen. Use when someone shares a video link and wants a summary, TL;DR, recap or the key takeaways.
---

# Summarize a video

1. Call The Downloader's `extract-transcript` tool with the video URL. Pass `language` only when the person asks for a specific caption language.
2. Read the whole result: the facts at the top (title, channel, duration, statistics, chapters) and the timestamped transcript lines `[m:ss] …`.
3. Write the summary in this shape:
   - **One or two sentences** on what the video is and who it's for.
   - **Key points**: 5–10 bullets in the order they come up. Start each with the timestamp where it's discussed, as a link, e.g. `[4:05](https://www.youtube.com/watch?v=ID&t=245s)`. The tool output shows the link format for that site.
   - **Takeaway**: one line on the most useful thing to remember.
4. Follow the video's chapters when it has them.
5. Keep names, numbers and claims exactly as said. Don't add facts the video doesn't contain; if you add context of your own, say so.
6. If the transcript isn't available, say so, then summarize from the title, description and chapters and make clear that's all you had.

Reply in the language the person wrote in, even when the video is in another language.
