# VocaBuilder

A [Raycast](https://raycast.com) extension that translates English words to Ukrainian via the Gemini AI API and saves a local translation history — helping you build vocabulary over time.

## Features

- **Translate Word** — type any English word and get an instant Ukrainian translation with part of speech and an example sentence
- **Translation History** — browse, search, and manage all your saved translations
- Auto-saves every successful translation
- Debounced search (no request fired mid-keystroke)
- Graceful error handling for API issues

## Setup

1. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)
2. Install the extension in Raycast dev mode:
   ```bash
   bun install
   bun run dev
   ```
3. Open Raycast → search **"Translate Word"** → enter your API key when prompted

## Commands

| Command | Description |
|---|---|
| Translate Word | Translate an English word to Ukrainian |
| Translation History | Browse saved translations |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ C` | Copy Ukrainian translation |
| `⌘ ⇧ H` | Open History (from Translate) |
| `⌘ D` | Delete entry (from History) |
| `⌘ ⇧ D` | Clear all history |

## Stack

- [Raycast API](https://developers.raycast.com)
- TypeScript + React
- [Zod](https://zod.dev) for runtime validation
- Gemini `gemini-2.5-flash-lite` model
- Bun

## License

MIT
