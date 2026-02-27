# Lingua

AI-powered translation extension for Raycast with polish and history features.

## Features

- AI-powered translation using OpenRouter LLMs (Claude, GPT-4, Gemini, etc.)
- Multiple language support (English, Chinese, Japanese, Korean, French, German, Spanish, etc.)
- Auto-detect source language
- Polish translation for better quality
- Translation history (up to 10 recent translations)
- Auto-load clipboard content
- Quick copy/paste actions

## Installation

### From Raycast Store (Recommended)
Search for "Lingua" in Raycast Store and install.

### Manual Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

## Configuration

### Get OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/keys)
2. Sign up and create an API key
3. Copy your API key (format: `sk-or-v1-...`)

### Configure in Raycast

Configure the following in Raycast extension preferences:

- **API Base URL**: API endpoint (required, default: `https://openrouter.ai/api/v1`)
- **API Key**: Your API key (required)
- **Model**: Model name (default: `openai/gpt-4o-mini`)
- **Target Language**: Default target language (optional, default: auto-detect)

Supported API endpoints:
- OpenRouter: `https://openrouter.ai/api/v1`
- OpenAI: `https://api.openai.com/v1`
- Any OpenAI-compatible API

### Recommended Models

Available models via OpenRouter:

- `openai/gpt-4o-mini` - GPT-4o Mini (recommended, fast and cost-effective)
- `openai/gpt-4o` - GPT-4o (more capable)
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet (high quality)
- `anthropic/claude-3-opus` - Claude 3 Opus (most powerful)
- `google/gemini-pro` - Gemini Pro
- More models at [OpenRouter Models](https://openrouter.ai/models)

## Usage

1. Open Raycast and search for `Translate Text`
2. Type or paste text to translate (clipboard content auto-loads)
3. Select target language from dropdown
4. Press `Cmd+Enter` to translate
5. Press `Cmd+L` to polish the translation
6. View history of recent translations

## Keyboard Shortcuts

- `Cmd+Enter`: Translate text
- `Cmd+L`: Polish translation
- `Cmd+R`: Translate again
- `Cmd+C`: Copy translation
- `Cmd+V`: Paste translation
- `Cmd+Shift+C`: Copy both original and translation

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Lint
npm run lint

# Fix lint issues
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

## License

MIT
