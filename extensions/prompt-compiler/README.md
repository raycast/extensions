# Prompt Compiler

A Raycast extension for BYOK multi-provider prompt optimization. It translates input in any language into polished English and an LLM-ready prompt, then copies the output to your clipboard.

## Features

- **Translate & optimize**: One action turns your text (any language) into natural English and a concise, instruction-style prompt.
- **Selected text first**: Automatically pre-fills from the current text selection when available.
- **Output modes**: Choose `Translation + Optimized Prompt`, `Translation Only`, or `Optimized Prompt Only`.
- **Single call**: Uses one API request per run for low latency.
- **Robust errors**: Clear guidance for invalid keys, rate limits/quota, provider downtime, and timeouts.
- **Clipboard**: The selected output mode is copied to the system clipboard automatically.
- **Multiple providers**: Choose DeepSeek, Kimi (Moonshot), OpenAI, Anthropic, or Gemini and paste that provider’s API key.

## Requirements

- [Raycast](https://www.raycast.com/) (macOS)
- An API key from one of the supported providers

## Supported Providers & Default Models

| Provider | Get API Key | Default Model |
|----------|-------------|---------------|
| **DeepSeek** | [platform.deepseek.com](https://platform.deepseek.com) | `deepseek-chat` |
| **Kimi (Moonshot)** | [platform.moonshot.cn](https://platform.moonshot.cn) | `moonshot-v1-32k` |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | `gpt-4o` |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | `claude-sonnet-4-5` |
| **Gemini** | [aistudio.google.com](https://aistudio.google.com) | `gemini-2.5-flash` |

You can override the default model in extension preferences (e.g. `gpt-4o-mini`, `claude-3-5-sonnet`).

## Installation

### From Raycast Store (when published)

1. Open Raycast and search for **Prompt Compiler**.
2. Install the extension.
3. Open **Extension Preferences** (⌘,) and set **API / Model** and **API Key**.

### From source

1. Clone the repo and go to the extension folder:
   ```bash
   cd prompt-compiler
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the extension in development mode:
   ```bash
   npm run dev
   ```
4. In Raycast, open the **Compile Prompt** command and configure **API / Model** and **API Key** in preferences (⌘,).

## Configuration

- **API / Model**: Select your provider (DeepSeek, Kimi, OpenAI, Anthropic, or Gemini).
- **API Key**: Paste the API key for the selected provider. Keys are stored locally and not sent anywhere except the chosen provider’s API.
- **Model (optional)**: Leave empty to use the default model for the provider, or enter a model ID (e.g. `gpt-4o`, `claude-3-opus`) to override.

## Data handling

- Input text is sent only to the provider you selected in extension preferences.
- API keys are stored in Raycast extension preferences on your machine.
- This extension does not run its own backend and does not forward your data to any service other than the selected provider API.

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Lint
npm run lint

# Fix lint
npm run fix-lint

# Build for production
npm run build

# Unit tests
npm test
```

After `npm run dev`, use the **Compile Prompt** command in Raycast to test. Changes to the code will hot reload.

## Project structure

```
prompt-compiler/
├── assets/
│   └── icon.png          # Extension icon (512×512 PNG)
├── tests/
│   └── llm.test.ts       # LLM parser/error mapping unit tests
├── src/
│   ├── index.tsx         # Main command: form, API call, result view, clipboard
│   └── lib/
│       └── llm.ts        # LLM client (OpenAI-compatible + Anthropic Messages API)
├── package.json         # Raycast manifest and preferences
├── tsconfig.json
├── jest.config.cjs
└── README.md
```

## License

MIT
