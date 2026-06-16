# DeepL Tools

Raycast extension for quick DeepL translation.

## Commands

- Translate selected text, falling back to clipboard text when nothing is selected.
- Translate clipboard text in a full Raycast view.
- Translate typed Raycast search text.

## Setup

Create a DeepL API key in your DeepL account under `Account -> API Keys`, then paste it into the extension preferences.

DeepL auth docs: https://developers.deepl.com/docs/getting-started/auth

Use `https://api-free.deepl.com/v2/translate` for free API keys or `https://api.deepl.com/v2/translate` for Pro API keys.

## Development

```bash
npm install
npm run lint
npm run build
```
