# AI Text & Voice Translator

Translate typed text or recorded speech with an OpenAI-compatible API, then paste the result directly into the active app.

## Features

- Choose which target languages appear in the extension. Spanish, English, and Brazilian Portuguese are enabled by default, with French, German, Italian, Japanese, Korean, and Simplified Chinese available.
- Record speech and transcribe it with `gpt-4o-transcribe` before choosing the target language.
- Paste translations at the current cursor position, with an automatic clipboard fallback.
- Search, paste, copy, or delete up to 100 locally stored translations.
- Use OpenAI or another provider that implements compatible chat completion and audio transcription endpoints.

## Requirements

Voice recording requires [SoX](https://sox.sourceforge.net/):

```bash
brew install sox
```

macOS will ask for microphone access the first time the voice command records audio.

## Setup

Configure these extension preferences in Raycast:

- `OpenAI-Compatible Base URL`: defaults to `https://api.openai.com/v1`.
- `OpenAI API Key`: required bearer token, stored by Raycast as a protected password preference.
- `Translation Model`: exact model identifier used for translation.
- `Target Languages`: choose which languages appear in the text and voice translation commands.

Text translation calls `POST <base-url>/chat/completions`. Voice transcription calls
`POST <base-url>/audio/transcriptions` with the fixed `gpt-4o-transcribe` model.

## Translate Text

1. Place the cursor, or select text to replace, in the destination app.
2. Open `Translate`.
3. Type or paste text into Raycast's main search bar.
4. Choose the target language and press Enter.

## Record and Translate

1. Place the cursor in the destination app.
2. Open `Record and Translate`. Recording starts automatically.
3. Press Enter on `Stop Recording` when you finish speaking.
4. Choose the target language after transcription.

Temporary audio is recorded as a mono 16 kHz WAV file and deleted after processing.

## Translation History

Open `Translation History` to search previous translations. The primary action pastes the selected translation into the active app. Additional actions copy the translation or original text and remove stored entries.

## Privacy

- Typed text and recorded audio are sent only to the configured API provider.
- The API key is stored as a protected Raycast preference.
- Translation history is stored in Raycast's encrypted local storage.
- Temporary audio files are removed after transcription, cancellation, or recording failure.

## Development

```bash
npm install
npm run dev
```

Run the local quality gates:

```bash
npm test
npm run lint
npm run build
```

`npm run lint:store` also validates Store metadata and the Raycast author account.

Before publishing, sign in with `npx ray login`, confirm the username with `npx ray profile`, and make sure the
manifest's `author` value matches that profile. Then run:

```bash
npm run lint:store
npm run publish
```
