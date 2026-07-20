# Text Enhance

Raycast extension for rewriting rough drafts with Raycast AI.

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
- copies generated output automatically when enabled in preferences

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
- creativity
- extra instruction

How it works:

- choose `No Preset` to work with custom settings
- choose a named preset from the preset dropdown to apply it
- press `Cmd+S` to save the current settings as a new preset
- press `Cmd+Shift+Backspace` to delete the selected preset

If you manually change preset-controlled fields after applying a preset, the UI switches back to `No Preset`.

## Remembered Settings

When no preset is selected, the extension remembers the last used settings for:

- purpose
- enhancement
- tone
- model
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

These are startup defaults only. They are separate from named presets.

## Model Access

Models in this extension are provider-specific.

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
- Raycast AI enabled for the user account, or compatible model access configured through Raycast

## Storage Model

The extension currently stores three kinds of data:

- presets: named saved settings
- history: saved generation results
- Raycast preferences: global startup defaults

Raycast form drafts are intentionally disabled.

## Publishing Note

The `author` field in `package.json` must match your Raycast username for publishing and validation.
