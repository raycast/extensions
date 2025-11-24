# AI Actions

Raycast extension for quick AI text processing with customizable prompts.

## Features

- 🎯 Process selected text instantly
- 🔧 Fully customizable prompts
- 🌐 Support multiple AI endpoints (Gemini, gemini-balance, OpenRouter)
- ⚡ Fast and convenient

## Quick Start

1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Configure in Raycast Extension Preferences:
   - API Key
   - Model name
   - Custom Endpoint (optional)

## Commands

### Manage AI Prompts
Create, edit, and delete your custom AI prompts.

### Run AI Prompt
Select and run a custom AI prompt on selected text.

## Example Prompts

### Translate to Chinese
```
Title: Translate to Chinese
Prompt: Translate to Traditional Chinese. Output ONLY the translated text:

{selection}
```

### Summarize
```
Title: Summarize
Prompt: Summarize the following content in Traditional Chinese, maximum 500 words:

{selection}
```

See main [README](../README.md) for more examples.

## License

MIT
