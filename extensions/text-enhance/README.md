# Text Enhance

Raycast extension for rewriting rough drafts with Raycast AI or your own provider API key.

It is built for a fast keyboard-first flow:

- select text in another app and open the command
- adjust purpose, enhancement, tone, model, and instructions
- generate improved text and copy it instantly
- save reusable named presets
- reopen previous results from history

## Commands

### Enhance Text

Main command for rewriting text.

Features:

- uses selected text first, then clipboard as fallback
- supports purpose-specific rewriting such as email, Telegram, Slack, proposal, or plain text
- supports named presets through a dedicated preset dropdown
- supports follow-up correction prompts for regeneration
- offers **Compare with Original** after generation and in history, with added and removed words highlighted
- copies generated output automatically when enabled in preferences
- lets you cancel a slow generation request
- warns when a provider reports that output was cut off; partial results stay visible but are not copied or saved automatically

### Enhancement History

Separate command for browsing previous generations.

Features:

- list previous generated outputs
- inspect full draft and result
- copy a previous result back to the clipboard
- delete a single item
- clear all history

## Presets

Presets are named saved configurations, not Raycast drafts.

Each preset stores:

- purpose
- enhancement
- tone
- model
- AI provider
- provider model ID
- creativity
- extra instruction

How it works:

- choose `No Preset` to work with custom settings
- choose a named preset from the preset dropdown to apply it
- press `Cmd+S` to save the current settings as a new preset
- press `Cmd+Shift+Backspace` to delete the selected preset

If you manually change preset-controlled fields after applying a preset, the UI switches back to `No Preset`. Existing presets without a provider or provider model use the current extension preference defaults.

## Remembered Settings

When no preset is selected, the extension remembers the last used settings for:

- purpose
- enhancement
- tone
- model
- AI provider
- provider model ID
- creativity
- extra instruction

The draft text itself is not remembered.

Use `Cmd+Shift+R` in the main command to clear remembered settings and return to your extension preference defaults.

## Preferences

The extension includes global defaults in Raycast preferences:

- default purpose
- default enhancement
- default tone
- default model
- default creativity
- default extra instruction
- auto-copy generated result
- save generated text to history

Saved API keys remain in extension preferences and are never included in presets or history.

These are startup defaults only. They are separate from named presets.

## Model Access

Select a **Generation Provider** in the extension preferences. The default is OpenRouter. Add the matching API key in its password field. Pick the provider and model in the command; OpenRouter models load from its current catalog. You can also type any supported model ID. Preferences set the startup provider and model.

Default provider models:

- OpenRouter: `openai/gpt-5-mini`
- OpenAI: `gpt-5-mini`
- Anthropic: `claude-sonnet-4-6`
- Google Gemini: `gemini-2.5-flash`

Direct provider requests use your API key and your provider's billing or quota. The key is kept in Raycast's encrypted extension preferences; it is not saved with presets or history. The draft is sent to the selected provider when you generate text. Reopen the command after changing API key preferences.

Disable **Save generated text to history** in extension preferences if drafts and results should only remain in the current session. This does not delete existing history; use Enhancement History to clear old entries.

Select **Raycast AI** as the provider to use Raycast's Extension AI API and its model dropdown. This requires Raycast AI access.

Named Raycast models are provider-specific.

The default **Automatic** option uses Raycast's default AI model. If a selected model returns “No model found,” the extension retries once with Automatic and updates the selection. If Automatic also fails, check Raycast Settings > AI > Models & Providers and ensure a Raycast model is enabled. Local models cannot power Raycast's Extension AI API.

Examples:

- Google Gemini models require Raycast Pro or a Google API key configured in Raycast Settings > AI
- Anthropic Claude models require Raycast Pro or an Anthropic API key configured in Raycast Settings > AI
- OpenAI GPT models require Raycast Pro or an OpenAI API key configured in Raycast Settings > AI

Important:

- OpenRouter keys in Raycast do not automatically apply to provider-specific Google, Anthropic, or OpenAI model selections in this extension
- the extension uses Raycast's public AI model API, which does not expose the same dynamic model picker as Raycast Quick AI

## Development

Install dependencies:

```bash
npm install
```

Run in local Raycast development mode:

```bash
npm run dev
```

Validate the extension:

```bash
npm run lint
npm run build
```

## Requirements

- Raycast installed on macOS
- a provider API key, or Raycast AI access when using the Raycast provider

## Storage Model

The extension currently stores three kinds of data:

- presets: named saved settings
- history: up to 50 saved drafts and results in an encrypted file in Raycast's extension support directory
- Raycast preferences: global startup defaults

Older history stored in Raycast LocalStorage is moved to the encrypted file on first access. The encryption key remains in Raycast LocalStorage. If history saving is disabled, existing entries remain available until you clear them.

This keeps drafts and results out of a readable history file. Someone with access to both the history file and this extension's LocalStorage can still recover them.

Raycast form drafts are intentionally disabled.

## Publishing Note

The `author` field in `package.json` must match your Raycast username for publishing and validation.
