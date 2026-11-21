# Qwen AI

Chat with Alibaba's **Qwen (Tongyi Qianwen)** AI models directly from Raycast. Powered by the DashScope API with OpenAI-compatible interface.

## Features

- 💬 **Streaming responses** — watch answers appear in real time
- 💾 **Chat history persistence** — conversations survive restarts via LocalStorage
- 🔄 **OpenAI-compatible** — works with any endpoint that follows the OpenAI chat completions format
- 🎯 **Model selection** — switch between qwen-plus, qwen-turbo, qwen-max, and more
- ⌨️ **Keyboard-first** — ⌘K to send, ⌘⇧⌫ to clear history

## Setup

1. Install the extension from the Raycast Store
2. Get your API Key from [Alibaba Cloud Bailian Console](https://bailian.console.aliyun.com/)
   - Sign in → Activate Bailian service → Create an API Key
3. Open Raycast Settings → Extensions → Qwen AI → paste your API Key
4. Run the **Qwen Chat** command and start chatting!

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | Your DashScope API Key (required) | — |
| Base URL | OpenAI-compatible API endpoint | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Model | Model name | `qwen-plus` |

### Supported Models

| Model | Best For |
|-------|----------|
| `qwen-plus` | Balanced performance and cost |
| `qwen-turbo` | Fast responses, lower cost |
| `qwen-max` | Highest quality, complex reasoning |
| `qwen-flash` | Lightweight tasks, often free-tier available |

See the [Bailian Model Gallery](https://bailian.console.aliyun.com/#/model-market) for the full list.

### Custom Endpoints

You can point this extension at any OpenAI-compatible API by changing the Base URL. This is useful for:

- Self-hosted models (vLLM, Ollama, LM Studio)
- International DashScope endpoint: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- Other providers with OpenAI-compatible APIs

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open action panel → Send message |
| `⌘⇧⌫` | Clear conversation history |

## Troubleshooting

**403 Free quota exhausted**
Your model's free tier has been used up. Switch to another model (each has independent quota) or enable paid billing in the Bailian console.

**401 Invalid API Key**
Double-check your API Key in Raycast Settings → Extensions → Qwen AI.

**Model claims to be ChatGPT**
This is a known behavior when calling Qwen via OpenAI-compatible APIs without a system prompt. This extension includes a built-in identity prompt to fix it.

## License

MIT
