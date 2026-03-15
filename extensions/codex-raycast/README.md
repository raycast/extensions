# ChatGPT — Codex CLI

Ask ChatGPT directly from Raycast, powered by your local **OpenAI Codex CLI**. 

No API key juggling — just your existing ChatGPT Plus subscription.

---

## Key Features

- **Instant answers** — Ask any question without leaving your keyboard
- **Model selection** — Choose between GPT 5.4 and GPT 5.1 Codex Mini per query
- **Cross-platform** — Works on both macOS and Windows
- **Sandboxed execution** — Runs Codex in read-only, ephemeral mode for safety
- **Markdown rendering** — Responses are rendered with full Markdown support

---

## Prerequisites

Before using this extension you need:

1. **OpenAI Codex CLI**
2. **Active ChatGPT Plus subscription** 


## How It Works

1. Opens a form in Raycast where you type your question and choose a model.
2. The extension checks that the Codex CLI is installed and you are logged in.
3. Your prompt is forwarded to `codex exec` in a sandboxed, ephemeral session.
4. The response is written to a temporary file, read back, and rendered as Markdown inside Raycast.

---

## Available Models

| Model | Description |
|---|---|
| **GPT 5.4** | Latest full-capability model (default) |
| **GPT 5.1 Codex Mini** | Faster, optimised for code-focused tasks |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| *"Codex not installed"* | Run `npm install -g @openai/codex` or `brew install codex` |
| *"Not logged in"* | Run `codex login` in your terminal |
| *Empty response* | Ensure your ChatGPT Plus subscription is active |
| Extension not appearing in Raycast | Re-import the extension folder from Raycast settings |

---

## License

MIT © [jpmesperanca](https://github.com/jpmesperanca)
