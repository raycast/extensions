# YouTube Summary Pro

A Raycast extension that generates comprehensive summaries of YouTube videos using AI. Perfect for quickly understanding video content without watching the entire video.

**Generate Truly Useful, Detailed AI Summaries of YouTube Videos Directly Within Raycast.**

Tired of scrubbing through videos or getting superficial AI summaries that miss the point? This extension focuses on creating **comprehensive and actionable summaries** that preserve the core information, nuances, and key details from YouTube videos. Paste a URL and get a summary designed for actual understanding, including:

- A Concise Executive Summary
- Logically Organized Thematic Sections covering key concepts and arguments
- Specific, Actionable Insights & Key Takeaways derived from the content
- Notable Quotes capturing the speaker's key messages
- Detailed Timestamped Breakdowns for navigating complex topics

![YouTube Summary Pro Screenshot](metadata/youtube_summary_pro_1.png)

---

## Features

- **Deep AI Summarization, Not Simplification:** Leverages Raycast AI with carefully crafted prompts (`DETAIL_PROMPT` & `OVERVIEW_PROMPT` - see code) specifically designed to **extract valuable details, examples, and nuances**, rather than just providing a high-level, often unhelpful, overview.
- **Structured for Understanding:** Generates summaries organized into logical sections, making complex information easier to digest and retain.
- **Focus on Actionable Content:** Explicitly extracts practical advice, techniques (the "how-to"), and key takeaways presented in the video, listing them for easy reference.
- **Preserves Key Information:** Aims to capture all significant points, arguments, examples, and even the speaker's perspective, ensuring the summary is a genuinely useful substitute for re-watching.
- **Detailed Timestamped Summaries:** Breaks down the video into sections (`HH:MM:SS - HH:MM:SS`) with corresponding **detailed summaries for each part**, allowing you to dive deep into specific segments or quickly navigate long videos.
- **Handles Long Videos Effectively:** Intelligently splits long transcripts, summarizes each part in detail, and then synthesizes these into a coherent final overview, maintaining depth even for extensive content.

## How to Use

1.  **Copy a YouTube Video URL:** Find the video you want a _detailed_ summary of and copy its URL.
2.  **Open Raycast:** Activate Raycast (usually `⌥ + Space`).
3.  **Paste the URL:** Paste the copied URL directly into the Raycast search bar.
4.  **Select Action:** Choose "Generate New Summary" and press `Enter`.
5.  **Wait for Processing:** The extension will fetch the transcript and generate the detailed summary using AI. Progress is shown via Toasts.
6.  **View In-Depth Summary:** Once complete, the comprehensive summary opens automatically in Raycast's Detail view. Review the overview, actionable points, quotes, and timestamped sections.
7.  **Access History:** Revisit past detailed summaries via the "YouTube Summary Pro" command or by searching your history.

## Requirements

- [Raycast](https://raycast.com) installed.
- **Raycast Pro Subscription** or **Raycast AI Add-on**: Required for the AI-powered summary generation.
