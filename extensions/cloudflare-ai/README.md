# Cloudflare AI

Interact with Cloudflare AI models directly in Raycast with conversation history and follow-up messages.

## Features

- Query Cloudflare AI models (Llama, Mistral, Qwen, GPT-OSS, and more)
- Conversation history with persistent storage
- Follow-up questions with full context
- Pin important conversations
- Support for 19+ AI models

## Setup

### 1. Get Cloudflare Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/ai/workers-ai)
2. Select **Use REST API**.

#### Get your API Token:

   1. Click **Create a Workers AI API Token**.
   2. Review the prefilled information.
   3. Click **Create API Token**.
   4. Click **Copy API Token** and save it for future use.

#### Get your Account ID:

   - Copy the value for **Account ID** and save it for future use.

### 2. Install Extension

```bash
npm install
npm run dev
```

### 3. Configure in Raycast

1. Open Raycast
2. Search for "Query Cloudflare AI"
3. You'll be prompted to enter:
   - **Account ID**: Your Cloudflare account ID
   - **API Token**: The token you created
   - **Default Model** (optional): Choose your preferred AI model

## Usage

### Start a New Conversation

1. Open Raycast
2. Run "Query Cloudflare AI"
3. Type your question
4. Select a model from the dropdown
5. Press Enter

### Continue a Conversation

1. After receiving a response, type your follow-up question in the search bar
2. Press Enter to send
3. The AI will have full context of your previous messages

### View Conversation History

1. Open Raycast
2. Run "View Conversations"
3. Click on any conversation to continue it
4. Pin important conversations to keep them at the top

## Available Models

- Llama 3.3 70B, Llama 3.1 (70B, 8B), Llama 3 8B, Llama 2 7B
- Mistral 7B, Mistral Nemo 12B
- Qwen 1.5 (7B, 14B)
- GPT OSS 120B
- Gemma 7B
- Granite 8B Code Instruct
- DeepSeek Coder, DeepSeek Math
- And more...

## Keyboard Shortcuts

- `⌘ C` - Copy answer
- `⌘ ⇧ C` - Copy question & answer
- `⌘ ⇧ P` - Pin/unpin conversation
- `⌘ D` - Delete conversation

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build extension
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## License

MIT