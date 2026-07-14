# MiniMax - Raycast Extension

A "Bring Your Own Key" Raycast extension for AI chat. Supports **MiniMax M2.7**, **M2.5**, **M2.1**, and **M2** models with streaming responses, for both **China** and **International** regions.

## Features

- **Dual-region support** — China (`api.minimaxi.com`) and International (`api.minimax.io`) endpoints
- **Conversational chat** with persistent history
- **Streaming responses** in real-time
- **Quick question** (Ask AI) for simple queries
- **Conversation history** integrated in the main view
- **Automatic filtering** of model "thinking" content
- **Concise Mode** for brief, focused responses

## Installation

```bash
# Clone the repository
git clone https://github.com/MonforteGG/raycast-minimax
cd raycast-minimax

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Configuration

Open Raycast → Search for "AI Chat" → `Cmd + ,` to open preferences:

| Preference           | Type     | Description                                                                  |
| -------------------- | -------- | ---------------------------------------------------------------------------- |
| **MiniMax API Key**  | password | Your MiniMax API key (required)                                              |
| **API Endpoint**     | dropdown | China (`api.minimaxi.com`) or International (`api.minimax.io`) (default: International) |
| **Model**            | dropdown | MiniMax-M2.7 (recommended), M2.7-highspeed, M2.5, M2.5-highspeed, M2-her, M2.1, M2 |
| **System Prompt**    | text     | Custom system prompt (optional)                                              |
| **Temperature**      | dropdown | 0.3 / 0.7 / 1.0 / 1.5                                                       |
| **Max Tokens**       | dropdown | 1024 / 2048 / 4096 / 8192                                                    |
| **Stream Responses** | checkbox | Enable streaming (default: true)                                             |
| **Concise Mode**     | checkbox | Brief 2-3 sentence answers unless more detail requested (default: true)      |

### Getting a MiniMax API Key

**International users:**
1. Visit [MiniMax Platform](https://platform.minimax.chat/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy and paste it into the extension preferences

**China users:**
1. Visit [MiniMax Platform (China)](https://platform.minimaxi.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Select **China** as the API Endpoint in extension preferences and paste your key

## Commands

### AI Chat

Conversational chat with integrated history.

- **Top bar**: Type your message
- **Enter**: Send the message
- **Left panel**: New Chat + conversation history
- **Right panel**: Current conversation
- `Cmd + N`: New conversation
- `Cmd + Backspace`: Delete conversation
- `Cmd + C`: Copy conversation

### Ask AI

Quick question with streaming response.

- Type your question in the form
- See the response in real-time
- Actions: Copy, Paste, Continue in Chat

## Project Structure

```
raycast-minimax/
├── package.json              # Raycast manifest
├── tsconfig.json
├── assets/
│   └── icon.png
├── src/
│   ├── ask-ai.tsx            # Command: quick question
│   ├── ai-chat.tsx           # Command: chat with history
│   ├── providers/
│   │   ├── base.ts           # Provider interface
│   │   └── minimax.ts        # MiniMax API implementation
│   ├── hooks/
│   │   ├── useChat.ts        # Main chat hook
│   │   └── useChatStore.ts   # Chat state management
│   ├── components/
│   │   ├── ChatView.tsx      # Chat view
│   │   └── QuickAIResult.tsx # Quick response view
│   └── utils/
│       ├── storage.ts        # LocalStorage persistence
│       └── errors.ts         # Error handling
```

## MiniMax API

| Region      | Endpoint                                        |
| ----------- | ----------------------------------------------- |
| International | `https://api.minimax.io/v1/chat/completions`   |
| China       | `https://api.minimaxi.com/v1/chat/completions` |

**Models:**

- `MiniMax-M2.7`: Latest generation, recommended
- `MiniMax-M2.7-highspeed`: Fast variant of M2.7
- `MiniMax-M2.5`: Previous generation
- `MiniMax-M2.5-highspeed`: Fast variant of M2.5
- `M2-her`: Roleplay-optimized model
- `MiniMax-M2.1`: Earlier generation
- `MiniMax-M2`: Legacy model, 200k context

The provider automatically filters `<think>...</think>` content generated during the model's internal reasoning.

## Error Handling

- **401**: Invalid API key → Opens preferences automatically
- **429**: Rate limit → Wait message
- **500+**: Server error → Retry message

## Development

```bash
# Development with hot-reload
npm run dev

# Build
npm run build

# Lint
npm run lint

# Fix lint
npm run fix-lint
```

## Dependencies

- `@raycast/api`: ^1.104.5
- `@raycast/utils`: ^2.2.2

## Contributors

- [@monfortegg](https://github.com/monfortegg) — creator and maintainer
- [@tolshao](https://github.com/tolshao) — China region support, M2.7 models, API key validation (v1.2.0)

## License

MIT - see [LICENSE](LICENSE) for details.
