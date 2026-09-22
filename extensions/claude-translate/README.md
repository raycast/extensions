# Claude Translate

Translate text and AI prompts in Raycast using the Claude API.

## Features

- **Translate**: enter multi-line text and choose a target language for each translation.
- **Translate Clipboard**: translate clipboard text and replace it with the result.
- Choose Claude Opus 5, Sonnet 5, or Haiku 4.5.
- Translate into English, Japanese, Chinese (Simplified), Korean, Spanish, French, or German.
- Prompt-oriented translation preserves Markdown, code, file paths, URLs, and placeholders.

## Why

Built to translate prompts written in Japanese into English for AI assistants. The translation instructions preserve the imperative tone and tell Claude to translate only, never answer or execute the prompt.

## Install

Install from the [Raycast Store](https://www.raycast.com/nacky/claude-translate), then open Raycast Settings → Extensions → Claude Translate and enter your Anthropic API key.

To run from source instead, you'll need macOS, Raycast, Node.js with npm, and an Anthropic API key:

```bash
git clone https://github.com/nackyAir/raycast-claude-translate.git
cd raycast-claude-translate
npm install
npm run dev
```

## Preferences

| Preference | Description | Default |
| --- | --- | --- |
| Anthropic API Key | Required API key from console.anthropic.com | None |
| Model | Claude Opus 5, Sonnet 5, or Haiku 4.5 | Claude Opus 5 |
| Target Language | Default target for Translate and the language used by Translate Clipboard | English |

Text submitted for translation is sent to the Anthropic API using your key.

## Usage

- **Translate**: open the command, enter text, select a target language, and submit. Copy the result, paste it into the active app, or translate again with ⌘R.
- **Translate Clipboard**: copy text, then run the command. The translated text replaces your clipboard contents.

## Development

```bash
npm run dev    # Run in Raycast with live updates
npm run build  # Build the extension
npm run lint   # Check the extension
```

## License

[MIT](LICENSE) © 2026 nacky.
