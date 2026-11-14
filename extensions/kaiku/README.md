# Kaiku for Raycast

Control [Kaiku](https://github.com/gabry-ts/kaiku), the macOS call recorder, and look through your calls without leaving Raycast. Kaiku has to be installed; the extension tells you where to get it if it isn't.

## Commands

- **Start Recording**: starts a recording, with an optional title.
- **Stop Recording**, **Pause or Resume Recording**, **Add Bookmark**, **Mute or Unmute Microphones**: control the recording in progress.
- **Search Calls**: finds calls by title, tag, source or anything said in the transcript. You can open a call in Kaiku, copy its transcript or summary, or show its folder in Finder.
- **Ask Calls**: asks a question about your calls in the Kaiku chat, optionally limited to a tag, a source or the last few days.

## Privacy

The extension itself makes no network requests. Searching and reading calls goes through the `kaiku-mcp` helper inside the Kaiku app, and the recording commands talk to the app with `kaiku://` links.

Answers to Ask Calls come from the chat provider you picked in Kaiku's settings, which may be a cloud service.
