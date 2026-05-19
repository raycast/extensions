# AI Provider Switch

Manage Raycast AI `providers.yaml` from a visual interface instead of editing YAML by hand.

## Quick Start

1. Open Raycast and run **Manage AI Providers**.
2. Press `Cmd+N` to add a provider.
3. Fill in the provider ID, display name, base URL, and any API keys.
4. Open the provider, then press `Cmd+N` to add a model or `Cmd+R` to import remote models from the provider's `/models` endpoint.
5. Save changes. The extension writes to `~/.config/raycast/ai/providers.yaml` by default, preserves the existing file permissions, and creates `.providers.yaml.bak` before each save.

## Common Actions

### Provider List

- `Enter`: View models for the selected provider
- `Cmd+N`: Add provider
- `Cmd+Shift+E`: Edit provider
- `Cmd+Shift+C`: Duplicate provider, then review and save it in the provider form
- `Cmd+Shift+D`: Disable provider without permanently deleting its config
- `Ctrl+X`: Delete provider
- `Cmd+Shift+O`: Open the `providers.yaml` directory
- Restore `providers.yaml` from `.providers.yaml.bak` when a backup exists

### Model List

- `Cmd+N`: Add model
- `Cmd+T`: Test provider connection
- `Cmd+R`: Query and import remote models
- `Cmd+Shift+C`: Duplicate model, then review and save it in the model form
- `Cmd+Shift+D`: Disable model
- `Ctrl+X`: Delete model

### Provider and Model Forms

- Provider API keys are entered as named key/value rows. A model's optional `provider` field maps to one of those key names.
- Model ability templates are available for **Full**, **Basic**, and **Tools** setups, with individual toggles for custom cases.
- Remote model import lets you choose the context window, ability template, and API key mapping before saving imported models.
- Remote model sync separates new remote models, already configured models, and local models missing from the remote `/models` response.
- Duplicating a provider or model opens the relevant form with a unique copied ID, so you can adjust the copy before it is saved.

## Features

- Browse, add, edit, duplicate, disable, and delete AI providers.
- Browse, add, edit, duplicate, disable, and delete models.
- Query OpenAI-compatible `/models` endpoints and batch import selected models.
- Select all unconfigured remote models during import and review sync differences.
- Test provider connections with Bearer token authentication and a 5-second timeout.
- Support multiple named API keys per provider.
- Mask API keys in lists and detail views.
- Choose provider icons from bundled presets or upload custom icons.
- Write `providers.yaml` via permission-preserving atomic replacement, detect external file changes before saving, and keep a restoreable backup.
- Support Raycast provider fields such as `return_images` and `web_search_options.search_context_size`.
- Use a custom `providers.yaml` path from Raycast extension preferences.

## Configuration Files

The active Raycast AI configuration is stored in:

```text
~/.config/raycast/ai/providers.yaml
```

Disabled providers and models are stored outside the active YAML in `providers.disabled.json` next to `providers.yaml`, with a LocalStorage copy for extension state.

API keys are masked in the UI to reduce accidental exposure, but they remain plain text inside `providers.yaml`, because that is the format Raycast reads.

## Custom Path

1. Open Raycast Settings.
2. Search for **AI Provider Switch**.
3. Set **Providers YAML Path** to the file you want to manage.

## Development

This project pins its local Node.js version with `.nvmrc`.

```bash
nvm use
npm run lint
npm run build
```
