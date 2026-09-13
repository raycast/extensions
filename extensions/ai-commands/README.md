<div align="center">
  <picture>
    <img alt="AI Commands icon" height="128" src="assets/icon@dark.png">
  </picture>
  <h1>AI Commands for Raycast</h1>
</div>

Run prompts, chats, and custom commands through providers you configure in Raycast. The extension uses the Vercel AI SDK with an OpenAI-compatible transport, so the same inference flow works with local Ollama and compatible hosted providers.

Ollama is optional. When used, it is a built-in local provider for inference and a separate lifecycle integration for downloading, inspecting, loading, and removing local models.

## Getting started

1. Open **Manage Custom Providers**.
2. Configure a provider and add or sync its models. Providers must expose an OpenAI-compatible API.
3. Configure a model for an AI command or create a new chat in **AI Chat**.
4. Run any built-in command, a custom command, Quick AI, or a chat.

### Local Ollama

The extension creates an **Ollama (Local)** provider automatically, using `http://127.0.0.1:11434/v1`. Install and run Ollama separately, then configure or sync models in **Manage Custom Providers**.

Use **Manage Ollama Models** for Ollama-only lifecycle tasks such as pulling, deleting, inspecting, and loading models into memory. These operations do not change how chat or command inference is sent: inference always goes through the configured provider path.

## Features

### AI Chat

Create conversations with a configured provider and model. Chat supports:

- Provider-neutral conversation history and automatic chat naming.
- Text selection, clipboard, browser-tab, and image prompt tokens.
- Vision models, tool-capable models, and MCP servers when configured.
- Configurable chat-memory depth in extension preferences.
- Per-message reasoning and token metadata when returned by the provider.

Quick AI opens a fresh AI Chat by default. Its single-result mode uses the primary model from the most recent configured chat, so a provider and model are always selected together.

### Built-in and custom commands

Built-in commands cover writing, translation, summarization, code explanation, image understanding, and more. Use **Manage AI Commands** to choose a provider/model, adjust prompts, or change whether a command displays a result or replaces the current selection.

Use **Create AI Command** to create reusable custom commands and Raycast quicklinks.

Prompts support these tokens:

- `{selection}`: selected text, with clipboard fallback when enabled.
- `{browser-tab}`: the active browser tab. Use `{browser-tab format="html"}` or `{browser-tab format="text"}` for a specific format.
- `{image}`: an image from the clipboard or Finder; requires a vision-capable model.

### Tools and web access

MCP servers can expose tools to tool-capable models in AI Chat.

The optional Internet Search toggle uses Ollama Web Search and Web Fetch. It requires an **Ollama Web API Key** in extension preferences. This web service is independent of local Ollama inference; disable the toggle if you do not use it.

## Preferences

- **Input Source** and **Enable Input Source Fallback** control how `{selection}` is resolved.
- **Chat Memory Messages** controls how many recent turns are included in each chat request.
- **Quick AI View Mode** chooses chat or single-result Quick AI behavior.
- **Certificate Validation Enabled** is on by default. Disabling it permits invalid TLS certificates for compatible providers and should only be used with a trusted development server.
- **Ollama Web API Key** is only required for Ollama Web Search/Fetch tools.

## Platform notes

On Windows, selected-text access and clipboard/image handling can be constrained by Raycast and system permissions. If selected text is unavailable, set **Input Source** to Clipboard.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
npx tsc --noEmit
```

## License

[MIT](LICENSE)
