# VocaBuilder

A [Raycast](https://raycast.com) extension that translates words and short text between languages with the AI provider of your choice — Gemini, Anthropic, OpenAI, or any OpenAI-compatible server — and saves a local translation history to help you build vocabulary over time.

## Features

- **Bring your own AI provider** — use a Gemini, Anthropic, or OpenAI API key, or point the extension at an OpenAI-compatible server such as OpenRouter, Ollama, or LM Studio
- **Multi-sense word translations** — for ambiguous words, review up to 5 senses, each with part of speech, pronunciation transcription, and example sentences, and save the one you want to keep
- **Typo correction** — misspelled word input is auto-corrected before translating, with a visual indicator showing the original input
- **Word pronunciation** — hear the source word or its translation through Gemini or OpenAI speech, or the macOS system voice for providers without a speech model
- **Flashcards** — review saved word translations with spaced repetition
- **Separate history per language pair** — 17 languages in any pairing, switchable from a dropdown inside each command; each pair keeps its own history and flashcard deck
- **History export** — export saved history as JSON, an Anki-ready `Basic` note file, or Quizlet-ready TSV
- **Clipboard suggestion** — optionally prefill a safe word or short phrase from the clipboard when the command opens

## Getting Started

1. Get an API key from [Google AI Studio](https://aistudio.google.com) (Gemini, free tier available), the [Anthropic Console](https://console.anthropic.com), or the [OpenAI Platform](https://platform.openai.com).
2. Run the **Translate** command and paste the key when prompted. With **Provider** left on Auto-Detect, the extension recognizes Gemini (`AIza…`), Anthropic (`sk-ant-…`), and OpenAI (`sk-…`) keys.
3. For an OpenAI-compatible server, open the extension preferences, set **Provider** to OpenAI-Compatible Server, and fill in **API Server URL** (for example `https://openrouter.ai/api/v1` or `http://localhost:11434/v1`) and **Translation Model**. Local servers that need no key accept any value in **API Key**.
4. (Optional) In the preferences, set default languages, override the translation or speech model, choose the macOS system voice for pronunciation, or enable clipboard suggestions on open.

| Provider | Default translation model | Pronunciation |
| --- | --- | --- |
| Gemini | `gemini-3.5-flash-lite` | `gemini-3.1-flash-tts-preview` |
| Anthropic | `claude-haiku-5-5` | macOS system voice |
| OpenAI | `gpt-6-luna` | `gpt-4o-mini-tts` |
| OpenAI-compatible | none — set **Translation Model** | macOS system voice |

OpenAI speech overrides `tts-1` and `tts-1-hd` use the macOS system voice to preserve the selected pronunciation language. Pronunciation is unavailable when that language has no system voice.

**API Server URL** also routes Gemini, Anthropic, or OpenAI traffic through a proxy or gateway. Your API key is sent to whichever host you configure, so plain `http` is accepted only for local addresses, and URLs carrying credentials or a query string are rejected.

## Commands

| Command | Description |
| --- | --- |
| Translate | Translate a word or short text |
| Translation History | Open your saved translations |
| View Flashcards | Review words you've saved |

## Supported Languages

English, Ukrainian, Polish, German, French, Spanish, Italian, Portuguese, Dutch, Czech, Swedish, Japanese, Korean, Chinese, Turkish, Russian, Belarusian

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘ C` | Copy translation |
| `⌘ ⇧ L` | Pronounce source word |
| `⌘ ⇧ R` | Pronounce translation |
| `⌘ 1` → `⌘ 5` | Pick a word sense and save it to history |
| `⌘ ⇧ H` | Open History (from Translate) |
| `⌘ ⇧ T` | Toggle source and target languages |
| `⌘ D` | Delete entry (from History) |
| `⌘ ⇧ D` | Clear all history |
| `⌘ E` | Export history as JSON |
| `⌘ ⇧ A` | Export word history for Anki |
| `⌘ ⇧ Q` | Export word history for Quizlet |

## Development

Use the Node version pinned in [`.nvmrc`](.nvmrc) — **Node 22.22.2**, which bundles **npm 10.9.7** and matches the current Raycast extension toolchain. Then run the extension in Raycast dev mode:

```bash
nvm use        # Node 22.22.2 / npm 10.9.7
npm install
npm run dev
```

> Regenerate `package-lock.json` only on npm 10.x. npm 11 records optional peer dependencies differently, producing a lockfile that passes locally but fails the store CI's `npm ci`.

Built with the [Raycast API](https://developers.raycast.com), TypeScript + React, and [Zod](https://zod.dev) for runtime validation. Each provider is a small adapter over plain `fetch` in `src/lib/providers/`; the prompt, response validation, and sense de-duplication are shared in `src/lib/translation.ts`.

Tests run with `npm test`. The translation quality evals read their keys from `.env` — copy `.env.example` to start. `npm run eval` scores the Gemini provider and needs only `GEMINI_API_KEY`, which the eval judge also uses; `npm run eval:all` scores Gemini, Anthropic, and OpenAI side by side and also needs `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`.

## License

MIT
