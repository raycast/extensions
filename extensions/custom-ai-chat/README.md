# Custom AI Chat

Chat with your own AI models right from Raycast — cloud APIs or a local gateway — and keep every conversation and its context separate.

Bring your own model, pay your own provider, and stay in control of your data.

## What You Can Do

- **Chat with any OpenAI-compatible model** — OpenAI, Anthropic-compatible gateways, Ollama, LM Studio, or your own server
- **Use your own API key or no key at all** — connect to a local model without credentials
- **Keep conversations separate** — each chat remembers its own context; pick up where you left off
- **Switch models on the fly** — group models by provider and change them with one click
- **Stream responses** — watch answers appear in real time, and stop generation anytime

## Installation

Install **Custom AI Chat** from the Raycast Store. No account or signup is needed — the extension works with whatever models you connect.

## Quick Start

1. **Open the extension.** Search for `Ask AI` in Raycast and press Enter.
2. **Add a model.** On your first run you'll be taken to the Add Model form. Fill in:
   - **Base URL** — for OpenAI: `https://api.openai.com/v1` (for a local Ollama model: `http://localhost:11434/v1`)
   - **API Key** — your provider's key (leave empty for local models)
   - **Model ID** — e.g. `gpt-4o` or `llama3.2`
3. **Save, then ask a question.** Type your question in the search bar and press Enter. The answer streams in, and your chat is saved automatically.

That's it. To add more models, use **Add Model** (⌥⌘N) again — models sharing the same Base URL are grouped together.

## Common Workflows

**Ask about selected text.** Select text in any app, run `Ask AI`, and type your question. The selected text is added to your prompt — handy for explaining code, summarizing an article, or translating a passage.

**Keep multiple threads going.** Each conversation is independent. Use ↑/↓ to browse them; the one you used most recently stays at the top. Start a fresh one with ⌘N.

**Run models locally with no key.** Point the Base URL at a local gateway such as Ollama or LM Studio and leave the API Key empty. Nothing leaves your machine.

**Regenerate a reply.** Open the Action Panel and choose **Regenerate Response** to retry the last question with the current model.

**Use an API key without storing it in plain text.** Put the *name of an environment variable* in the API Key field, and the extension reads the key from that variable instead.

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Send message | Enter |
| Stop generation | ⌃C |
| New conversation | ⌘N |
| Delete conversation | ⌃X |
| Add model | ⌥⌘N |
| Edit model | ⌥⌘E |
| Regenerate response | Action Panel |

## FAQ

**Do I need a paid API key?**
Not necessarily. You can connect a free local model (Ollama, LM Studio) with no key, or use any provider you already have an account with.

**Where are my models and keys stored?**
Locally, in a `providers.yaml` file on your Mac — the same file Raycast AI uses. Your keys are only sent to the provider you configure, never to any other service.

**Why a config file instead of settings in Raycast?**
Using Raycast's native `providers.yaml` means the same models work in both Raycast AI and this extension — one file, no duplication. You can edit models through the extension, so you rarely need to touch the file by hand.

**Can I use a different config file?**
Yes. In the extension details you'll see two settings: **Custom Configuration File** lets you pick a file, and **Configuration File Path** shows the default path (you can edit it too). If you pick a custom file, that wins; otherwise the path is used.

**What if my config file is broken?**
The extension shows a setup page where you can open the file, fix it, and retry. It won't overwrite a broken file without your say-so.

**Are my conversations sent anywhere?**
Only to the model provider you chose, as part of your chat. Conversations are saved locally on your Mac. Closing the window stops generation.

## Privacy

- Keys stay in your local `providers.yaml` and go only to your chosen provider.
- To avoid storing a key in plain text, use an environment variable name in the API Key field.
- Conversations and their context are stored locally; closing the window stops generation.

## Advanced: Edit `providers.yaml` Directly

Most users don't need this — the Add Model form writes the file for you. If you prefer to edit it by hand, the default location is `~/.config/raycast/ai/providers.yaml`:

```yaml
providers:
  - id: openai
    name: OpenAI
    base_url: https://api.openai.com/v1
    api_keys:
      openai: OPENAI_API_KEY   # environment variable name, or the literal key
    models:
      - id: gpt-4o
        name: GPT-4o
      - id: gpt-4o-mini
        name: GPT-4o Mini

  - id: ollama
    name: Ollama
    base_url: http://localhost:11434/v1
    models:
      - id: llama3.2
        name: Llama 3.2
```

- `id` — short identifier for the provider; `name` is what you see in the menu
- `base_url` — the API root (a trailing `/chat/completions` is removed automatically)
- `api_keys` — optional; map a label to a key, or to an environment variable name
- `models[].id` — the exact model name your provider expects; `name` is the display label
