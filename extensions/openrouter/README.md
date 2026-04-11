# OpenRouter - Raycast Extension

A simple, high-performance Raycast extension for chatting with any AI model via OpenRouter (GPT-4, Claude 3.5, Llama 3.1, etc.).

## Features

- **OpenRouter Support**: Access the latest models from OpenAI, Anthropic, Meta, and more.
- **Streaming Responses**: See the AI's response in real-time as it's being generated.
- **Conversation History**: Automatically saves your chats so you can continue them later.
- **Clean Interface**: Focused entirely on messaging and productivity.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    cd huggingcast
    npm install
    ```

2.  **Start Development Mode**:
    ```bash
    npm run dev
    ```

3.  **Configure in Raycast**:
    - Open the **New Chat** command.
    - Go to **Extension Settings** (`Cmd + Shift + ,`).
    - Enter your **OpenRouter API Key** (get it at [openrouter.ai/keys](https://openrouter.ai/keys)).
    - Select your **Default Model ID**.

## Recommended Models

- **Free**: `meta-llama/llama-3.1-8b-instruct:free`
- **Fast**: `openai/gpt-4o-mini`
- **Powerful**: `anthropic/claude-3.5-sonnet`

## License

MIT
