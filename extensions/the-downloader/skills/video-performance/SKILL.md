---
name: video-performance
description: Analyze how a video is performing from its public statistics — views, likes, comments, views per day and engagement rates — and compare several videos side by side. Use when someone asks how a video is doing, whether it went viral, or which of a few videos performs best.
---

# Video performance

1. Call The Downloader's `get-video-info` tool once per video URL.
2. Use the numbers in the **Statistics** section: views, likes, comments, channel subscribers, upload date, age in days, views per day, likes per 100 views and comments per 1,000 views.
3. Report:
   - A short verdict in one sentence.
   - The key figures, as a table when comparing more than one video (columns: video, age, views, views/day, likes per 100 views, comments per 1,000 views).
   - What stands out: e.g. views per day far above or below the others, engagement much higher than views suggest, views relative to the channel's subscriber count.
4. Be careful with benchmarks. Only compare against the other videos given, or the channel's subscriber count. Don't invent "typical" rates; if you mention a rule of thumb, call it rough general knowledge.
5. Say when a figure is missing (some sites hide likes or comments) instead of treating it as zero.
6. For what the video is about, also call `extract-transcript`.

Reply in the language the person wrote in.
