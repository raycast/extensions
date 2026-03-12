# VocaBuilder

A [Raycast](https://raycast.com) extension that translates words between languages via the Gemini AI API and saves a local translation history — helping you build vocabulary over time.

## Features

- **Translate Word** — type a word and get an instant translation with part of speech and an example sentence
- **Typo correction** — misspelled input is auto-corrected before translating, with a visual indicator showing the original input
- **Translation History** — browse, search, and manage all your saved translations
- **Flashcards** — review saved words with spaced repetition
- **Configurable language pair** — pick source and target from 15 supported languages (defaults to English → Ukrainian)
- **Separate history per language pair** — switching languages gives you an independent history and flashcard deck
- Auto-saves every successful translation
- Debounced search (no request fired mid-keystroke)
- Graceful error handling for API issues

## Setup

1. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)
2. Install the extension in Raycast dev mode:
   ```bash
   npm install
   npm run dev
   ```
3. Open Raycast → search **"Translate Word"** → enter your API key when prompted
4. (Optional) Open extension preferences to change source/target language (defaults: English → Ukrainian)

## Commands

| Command | Description |
|---|---|
| Translate Word | Translate a word to your target language |
| Translation History | Browse saved translations |
| Flashcards | Review saved words with spaced repetition |

## Supported Languages

English, Ukrainian, Polish, German, French, Spanish, Italian, Portuguese, Dutch, Czech, Swedish, Japanese, Korean, Chinese, Turkish

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ C` | Copy translation |
| `⌘ ⇧ H` | Open History (from Translate) |
| `⌘ D` | Delete entry (from History) |
| `⌘ ⇧ D` | Clear all history |

## Stack

- [Raycast API](https://developers.raycast.com)
- TypeScript + React
- [Zod](https://zod.dev) for runtime validation
- Gemini `gemini-2.5-flash-lite` model
- npm

## License

MIT
