# VocaBuilder

A [Raycast](https://raycast.com) extension that translates words and short text between languages via the Gemini AI API and saves a local translation history — helping you build vocabulary over time.

## Features

- **Translate words and text** — translate a single word with part of speech and example sentences, or translate short text directly
- **Multi-sense word translations** — for ambiguous words, review up to 5 senses and save the one you want to keep
- **Word pronunciation** — hear the source word or its translation spoken aloud via Gemini text-to-speech
- **Typo correction** — misspelled word input is auto-corrected before translating, with a visual indicator showing the original input
- **Translation History** — accepted translations are saved automatically; browse, search, and manage them anytime
- **View Flashcards** — review saved word translations with spaced repetition
- **Configurable language pair** — pick source and target from 17 supported languages (defaults to English → Ukrainian), switchable from a dropdown inside each command or via preferences
- **Separate history per language pair** — switching languages gives you an independent history and flashcard deck
- **Clipboard suggestion** — optionally prefill a safe single word from the clipboard when the command opens
- **History export** — export saved history as JSON, Anki-ready TSV, or Quizlet-ready TSV
- Debounced word translation, with manual submit for text input
- Graceful error handling for API issues

## Getting Started

1. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com).
2. Run the **Translate** command and paste your API key when prompted.
3. (Optional) Open the extension preferences to set default languages, override the Gemini translation/speech models, or enable clipboard suggestions on open.

## Commands

| Command             | Description                    |
| ------------------- | ------------------------------ |
| Translate           | Translate a word or short text |
| Translation History | Open your saved translations   |
| View Flashcards     | Review words you've saved      |

## Supported Languages

English, Ukrainian, Polish, German, French, Spanish, Italian, Portuguese, Dutch, Czech, Swedish, Japanese, Korean, Chinese, Turkish, Russian, Belarusian

## Keyboard Shortcuts

| Shortcut      | Action                                   |
| ------------- | ---------------------------------------- |
| `⌘ C`         | Copy translation                         |
| `⌘ O`         | Pronounce source word                    |
| `⌘ ⇧ O`       | Pronounce translation                    |
| `⌘ 1` → `⌘ 5` | Pick a word sense and save it to history |
| `⌘ ⇧ H`       | Open History (from Translate)            |
| `⌘ ⇧ T`       | Toggle source and target languages       |
| `⌘ D`         | Delete entry (from History)              |
| `⌘ ⇧ D`       | Clear all history                        |
| `⌘ E`         | Export history as JSON                   |
| `⌘ ⇧ A`       | Export word history for Anki             |
| `⌘ ⇧ Q`       | Export word history for Quizlet          |

## Development

Use the Node version pinned in [`.nvmrc`](.nvmrc) — **Node 22.22.2**, which bundles **npm 10.9.7** and matches the current Raycast extension toolchain. Then run the extension in Raycast dev mode:

```bash
nvm use        # Node 22.22.2 / npm 10.9.7
npm install
npm run dev
```

> Regenerate `package-lock.json` only on npm 10.x. npm 11 records optional peer dependencies differently, producing a lockfile that passes locally but fails the store CI's `npm ci`.

Built with the [Raycast API](https://developers.raycast.com), TypeScript + React, and [Zod](https://zod.dev) for runtime validation. Translations use Gemini — defaults `gemini-3-flash-preview` (text) and `gemini-3.1-flash-tts-preview` (speech), configurable in preferences.

## License

MIT
