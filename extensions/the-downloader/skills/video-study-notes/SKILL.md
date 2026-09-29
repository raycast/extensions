---
name: video-study-notes
description: Turn a lecture, tutorial or talk video into structured study notes with timestamped sections, definitions, steps and review questions. Use when someone wants notes, a cheat sheet, a how-to or flashcards from a video link.
---

# Study notes from a video

1. Call The Downloader's `extract-transcript` tool with the video URL.
2. Build the notes from the transcript, in the video's order:
   - `## <Section title>` for each chapter or topic shift, with a linked timestamp for where it starts, e.g. `[12:30](https://www.youtube.com/watch?v=ID&t=750s)`.
   - Under each section: the main ideas as short bullets, **bold** for key terms.
   - A **Definitions** list for terms the speaker explains.
   - Numbered **Steps** for any procedure, command or recipe, with exact values (commands, settings, quantities) as spoken.
3. End with **Review questions**: 5 questions that test the main ideas, then the answers with their timestamps.
4. Only use what the video says. Mark anything you add from general knowledge as _(not from the video)_.
5. If there's no transcript, say so and offer notes from the description and chapters only.

Reply in the language the person wrote in.
