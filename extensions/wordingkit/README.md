# WordingKit

Rewrite selected text in any macOS app with a local Ollama model or an optional
cloud provider. WordingKit includes editing modes for corrections, clarity,
length, tone, work chat, social posts, and more.

## Set Up a Provider

WordingKit uses Ollama by default with `qwen3:14b`.

1. Install and start [Ollama](https://ollama.com/).
2. Download the default model:

   ```bash
   ollama pull qwen3:14b
   ```

3. In Raycast, open **WordingKit Settings** and adjust a mode if you use a
   different local model.

To use OpenAI, Anthropic, or Groq instead, open Raycast Settings, find
WordingKit under Extensions, and add the corresponding API key. Provider keys
are optional and are only needed by modes configured for that provider.

## Rewrite Text

1. Select text in any macOS app.
2. Open Raycast and run **Rewrite This**.
3. Choose an editing mode.

WordingKit sends the selection to the provider configured for that mode and
pastes the rewritten text back into the source app.

## Manage Editing Modes

Open **WordingKit Settings** to:

- create or edit a mode;
- choose its provider and model;
- customize its system prompt, temperature, and token limit;
- reorder modes manually or by last use;
- delete modes or reset all modes to the English or Russian preset.

Changing **Preset Language** in Raycast Preferences does not alter existing
modes. The selected preset is applied only after you confirm **Reset Modes** in
WordingKit Settings.

## Privacy

- WordingKit has no backend and does not store provider responses remotely.
- Ollama modes send text only to the configured local Ollama server.
- Cloud modes send text directly to the selected provider API.
- API keys stay in Raycast password preferences.
- Provider errors redact the configured API key before they are displayed.

For source code, development instructions, and support information, visit the
[WordingKit repository](https://github.com/suregoodru/wordingkit).
