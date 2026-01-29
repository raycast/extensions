# OpenCode AI for Raycast

Query AI models through [OpenCode](https://opencode.ai) directly from Raycast. Use your own API keys with Claude, GPT, Gemini, and more.

## Features

- **Streaming Responses** - See AI responses as they're generated
- **Multiple Providers** - Use any provider configured in OpenCode (Anthropic, OpenAI, Google, etc.)
- **Tool Execution** - AI can use tools with permission controls
- **Quick Ask** - Type "Ask AI <question>" directly in Raycast root search
- **Model Selection** - Choose from all your configured models

## Prerequisites

1. **OpenCode CLI** - Install from [opencode.ai](https://opencode.ai):

   ```bash
   npm install -g opencode-ai
   ```

2. **Configure a Provider** - Run `opencode` and use `/connect` to add at least one AI provider with your API key.

## Installation (Local)

Since this extension is not yet in the Raycast Store, install it locally:

### Option 1: Import Extension (Recommended)

1. Clone the repository:

   ```bash
   git clone https://github.com/MattieTK/raycast-opencode.git
   cd raycast-opencode
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Open Raycast, search for "Import Extension" and select the `raycast-opencode` folder.

Raycast will automatically build and load the extension.

### Option 2: Development Mode

Run the extension in development mode with hot reload:

```bash
git clone https://github.com/MattieTK/raycast-opencode.git
cd raycast-opencode
npm install
npm run dev
```

This opens Raycast with the extension loaded. Changes to the source code will automatically rebuild.

### Option 3: Manual Build

```bash
git clone https://github.com/MattieTK/raycast-opencode.git
cd raycast-opencode
npm install
npm run build
```

After running `npm run build`, the extension will appear in Raycast. Search for "Ask OpenCode" or "Ask AI".

### Updating

To update to a newer version:

```bash
cd raycast-opencode
git pull
npm install
npm run build
```

## Commands

### Ask OpenCode

Full-featured command with:

- Text area for your prompt
- Model selection dropdown
- Response metadata (tokens, cost, speed)

### Fast Ask

Type directly in Raycast root search:

```
Fast Ask what is the capital of France
```

Uses your default model for quick queries.

## Configuration

Open **Raycast Preferences → Extensions → OpenCode AI** to configure:

| Preference    | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| Default Model | Model to use for queries (e.g., `anthropic/claude-sonnet-4-5`) |

## How It Works

1. The extension starts an OpenCode server on port 14096 (dedicated to Raycast)
2. Queries are sent via the OpenCode SDK
3. Responses stream back via Server-Sent Events (SSE)
4. If the AI needs to use tools, you'll see a permission dialog

## Troubleshooting

### "Failed to connect to OpenCode"

1. Make sure OpenCode is installed: `npm install -g opencode-ai`
2. Verify you have a provider configured: run `opencode` and use `/connect`
3. Check if port 14096 is available

### No models showing

You need at least one provider configured in OpenCode with valid API credentials.

### Extension not appearing after build

1. Make sure `npm run build` completed without errors
2. Try searching for "Ask OpenCode" in Raycast
3. Check Raycast Preferences → Extensions to see if it's listed

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Lint and format
npm run fix-lint

# Build for production
npm run build
```

## License

MIT
