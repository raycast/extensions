# AI Translator

Translate clipboard text, selected text, and short notes with an OpenAI-compatible chat completions API.

## Features

- Translate clipboard text in a preview command before copying or pasting.
- Translate selected text and replace it in the active app.
- Automatically detect the source language and route translations between your primary and secondary languages.
- Choose explicit source or target languages when automatic routing is not enough.
- Keep local translation history for quick reuse.
- Expand bullet points into polished Vietnamese and English content.

## Preferences

- **API Key**: API key for your OpenAI-compatible provider.
- **API URL**: Chat completions endpoint, for example `https://api.openai.com/v1/chat/completions`.
- **AI Model**: Model name supported by your provider.
- **Primary Language**: Your main language.
- **Secondary Language**: Your second language.

## Commands

- **Translate**: Preview a translation from the clipboard or launch context.
- **Translate (Form)**: Manually enter text and choose languages.
- **Quick Translate (Toast)**: Translate clipboard text without opening a view.
- **Translate Selection**: Translate selected text and open the preview flow.
- **Translation History**: Browse, copy, paste, or delete saved translations.
- **Expand Content**: Turn short notes into bilingual long-form content.
