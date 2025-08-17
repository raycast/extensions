# OpenRouter Models Finder

A Raycast extension to search and copy AI model IDs from OpenRouter.

## Features

- 🔍 Real-time search through all OpenRouter models
- 📋 Copy model IDs to clipboard with one click
- 📊 Display context window sizes with smart unit formatting (B/M/K tokens)
- 🆕 Sort by release date - newest models first
- 🌐 Quick access to model details on OpenRouter website

## Usage

1. Search for "Find Models" in Raycast
2. Type keywords to filter models
3. Press Enter to copy the model ID to clipboard
4. Use additional actions to copy model name or view on OpenRouter

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Privacy & Security

- Uses [OpenRouter's public API](https://openrouter.ai/api/v1/models) - no authentication required
- No user data is collected, stored, or transmitted
- Read-only access to publicly available model information

## Credits

- **API**: Model data provided by [OpenRouter](https://openrouter.ai)
- **Icon**: OpenRouter logo used under fair use. All rights reserved by OpenRouter.

## Author

Created by `@jeejeeguan`

## License

MIT
