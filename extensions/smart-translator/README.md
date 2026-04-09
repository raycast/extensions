# Smart Translator

Multilingual translator with 4 tone variations (Polite, Casual, Business, Slang).

Smart Translator translates text between your two preferred languages and returns four tone variations in a single request. It supports bidirectional language detection, selected-text auto-translation, streaming output, and on-the-fly model switching.

## Requirements

- **Raycast Pro is required.** This extension uses Raycast's built-in `AI.ask` API. If you are not subscribed to Raycast Pro, Raycast will prompt you to upgrade the first time you run the command.
- macOS
- No API keys to configure. All AI calls go through Raycast Pro.

## Features

- **Two commands**: `Translate with Tones` (main command) and `Translation History`.
- **4 tones generated in a single request**: Polite, Casual, Business, and Slang are produced in one call, so you can pick the variant that fits your context.
- **20 supported languages**: Arabic, Chinese, Dutch, English, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Polish, Portuguese, Russian, Spanish, Swedish, Thai, Turkish, Ukrainian, Vietnamese.
- **Bidirectional language pair**: Configure a Base Language and a Target Language. Input in either direction is detected and translated into the other.
- **Two detection modes**: `Fast` uses Unicode script matching for instant detection. `Accurate` uses an AI call for reliable detection between languages that share scripts.
- **Selected-text auto-translation**: If you have text selected when you run `Translate with Tones`, it is translated immediately without opening the input form.
- **Multiple AI providers**: OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Meta (Llama), and Perplexity. The full set of models exposed by Raycast Pro is available.
- **Change model from the result view**: Press `Cmd+M` on the result screen to switch models and re-translate the same text instantly.
- **Streaming output**: Translations stream into the result view as they are generated.
- **Translation history**: The last 50 translations are stored locally and searchable from the `Translation History` command.

## Setup

Open the extension preferences in Raycast to configure:

- **Base Language** — Your primary language. Any input that is not in your base language will be translated into it.
- **Target Language** — Your secondary language. Base-language input will be translated into it across all 4 tones.
- **Detection Mode**
  - `Fast` — Instant detection based on Unicode script patterns. Best when your base and target languages use clearly different scripts (for example, Japanese and English).
  - `Accurate` — Uses a lightweight AI call to detect the input language. Use this when your language pair shares a script (for example, English and French).

All preferences are optional. If left unset, the extension defaults to Japanese (base) and English (target) with Fast detection.

## Usage

### Translating from the form

1. Open `Translate with Tones`.
2. Type or paste text into the input field. You can enter text in either your base or target language.
3. Optionally change the AI model from the dropdown below the text field.
4. Press `Enter` to translate.

The result view shows:

- If the input is in your base language: 4 tones in the target language.
- If the input is in your target language (or anything else): the base-language translation plus 4 target-language tones.

### Selected-text auto-translation

Select text anywhere on your Mac, then run `Translate with Tones`. The extension reads your current selection and starts translating it immediately. The same selection will not re-trigger auto-translation until the selection changes.

### Tone guide

- **Polite** — Respectful and considerate. Good for general polite speech.
- **Casual** — Relaxed and conversational. Good for friends and chat.
- **Business** — Formal and professional. Good for work email and meetings.
- **Slang** — Informal and colloquial. Good for casual social contexts.

### Keyboard shortcuts

On the result view and history detail view:

| Shortcut | Action |
| --- | --- |
| `Cmd+1` | Copy Polite |
| `Cmd+2` | Copy Casual |
| `Cmd+3` | Copy Business |
| `Cmd+4` | Copy Slang |
| `Cmd+Shift+C` | Copy all sections |
| `Cmd+M` | Change model (result view only) |

In the history list:

| Shortcut | Action |
| --- | --- |
| `Cmd+1` | Copy the first tone of the selected entry |
| `Ctrl+X` | Delete the selected entry |

### Switching models

From the result view, press `Cmd+M` to open a submenu of all available providers and models. Selecting a model immediately re-translates the current text with the new model. The current model is marked with a check. Your selection is remembered and becomes the default for subsequent translations.

### Translation History

Open `Translation History` to browse the last 50 translations. Each entry shows the original text, the language pair, the model used, and the timestamp. Use the search bar to filter entries, press `Enter` to view the full result, and use the action panel to delete a single entry or clear all history.

## Why this extension?

- **4 tones in one call.** Other translator extensions return a single rendering. Smart Translator returns four distinct tones per translation, so you can pick the right register for the situation without re-prompting.
- **Bidirectional by design.** Configure a language pair once and translate in either direction without switching settings.
- **Model agility.** Switch between OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Llama, and Perplexity models directly from the result view and re-translate the same text in place.

## License

MIT
