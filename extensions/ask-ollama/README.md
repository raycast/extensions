# Ask Ollama

A Raycast extension that allows you to chat with your local Ollama AI models directly from Raycast.

## Features

- Chat with any locally installed Ollama model
- Easy setup and configuration
- Persistent chat conversations
- Follow-up questions support
- Settings management for URL and model selection
- Error handling for connection issues

## Prerequisites

1. **Ollama installed and running**: Make sure you have [Ollama](https://ollama.ai) installed on your system
2. **At least one model downloaded**: Download a model using `ollama pull <model-name>` (e.g., `ollama pull llama2`, `ollama pull mistral`)
3. **Ollama server running**: Start Ollama with `ollama serve` (usually runs on `http://localhost:11434`)

## Installation

1. Clone or download this extension
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Import into Raycast

## First-time Setup

When you first run the extension, you'll be prompted to configure:

1. **Ollama URL**: The URL where your Ollama server is running
   - Default: `http://localhost:11434`
   - If you're running Ollama on a different port (like `http://localhost:3001` as mentioned), update this URL
2. **Default Model**: Choose from your installed models
   - The extension will automatically fetch and display available models
   - Select the one you want to use as default

## Usage

### Basic Chat

1. Open the extension from Raycast
2. Click "Ask Question"
3. Type your question and press "Send"
4. View the response and continue the conversation

### Settings

- Access settings anytime via the "Settings" action
- Test your connection with "Test Connection"
- Change models or URL as needed

### Features

- **Clear Chat**: Remove all conversation history
- **Follow-up Questions**: Maintain context across multiple questions
- **Error Handling**: Clear error messages for connection or model issues

## Configuration

The extension saves your settings locally:

- Ollama server URL
- Default model selection

You can change these anytime through the settings interface.

## Troubleshooting

### Connection Issues

- Ensure Ollama is running: `ollama serve`
- Check if the URL is correct (default: `http://localhost:11434`)
- Verify network connectivity

### No Models Found

- Install a model: `ollama pull llama2` or `ollama pull mistral`
- Restart Ollama if you just installed a model
- Check `ollama list` to see installed models

### Common Ollama Commands

```bash
# Start Ollama server
ollama serve

# List installed models
ollama list

# Install a model
ollama pull llama2
ollama pull mistral
ollama pull codellama

# Remove a model
ollama rm <model-name>
```

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## API Endpoints Used

- `GET /api/tags` - Fetch available models
- `POST /api/chat` - Send chat messages

## License

MIT
