# LLM Spellfixer for Raycast

A spell correction extension powered by AI language models. Process selected text through your chosen AI provider with fully customizable prompts and settings.

## Features

- 🤖 Multiple AI Providers: OpenAI, Claude, and Ollama support
- 🎯 Flexible Configuration: Use any available model from supported providers
- 📝 Custom Prompts: Define exactly how the AI should process your text
- 🔄 Simple Workflow: Select text → Process → Auto-replace
- 🚀 Local & Cloud: Works with both cloud APIs and local models

## Setup

1. Install the extension
2. Configure your preferred AI provider:
   - OpenAI: Enter your API key
   - Claude: Enter your API key
   - Ollama: No API key needed, just install Ollama locally

## Usage

1. Select any text you want to process
2. Run the command through Raycast
3. The processed text automatically replaces your selection

💡 **Tip**: For the best experience, set up a keyboard shortcut (e.g., ⌘;) in Raycast preferences. This allows you to quickly correct text without leaving your current application.

## Configuration

- Choose from various AI models or use custom ones
- Define custom system prompts for specific use cases
- Adjust temperature and token limits
- Configure custom API endpoints

### Default Models

- OpenAI: GPT-4o mini, GPT-4o, GPT-3.5 Turbo
- Claude: Claude 3 Opus, Sonnet, Haiku
- Ollama: Llama 3.2 3B, Phi-4 (or any other local model)

### Temperature Settings

Default: 0.0 (optimized for consistent corrections)

- 0.0: Most consistent, deterministic output
- 0.3-0.7: Balanced creativity and consistency
- 1.0: Maximum creativity/variability

### Token Limits

- Default: 1024 tokens
- Configurable: Set any limit based on your needs and model capabilities
- Tip: Higher limits allow processing more text but may increase response time

### Custom API URLs

- OpenAI: https://api.openai.com/v1/chat/completions
- Claude: https://api.anthropic.com/v1/messages
- Ollama: http://localhost:11434/api/generate (default local)

## Requirements

- Raycast
- API keys for OpenAI or Claude (if using those providers)
- Ollama installed locally (if using local models)

## Troubleshooting

- If using Ollama, ensure the service is running locally
- For API errors, verify your API key and model availability
- Check your internet connection for cloud providers
- Ensure selected text is within token limits

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the extension
npm run build

# Fix linting issues
npm run fix-lint

## Support

For issues and feature requests, please open an issue on GitHub.

## License

MIT License
