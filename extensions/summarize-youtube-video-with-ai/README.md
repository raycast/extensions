# Summarize YouTube Video

Summarize any YouTube Video with AI and ask follow up questions to get all the details. Choose between Raycast AI, OpenAI ChatGPT or Anthropic Claude. You have to either be a [Raycast Pro](https://www.raycast.com/pro) Member, have access to an [OpenAI API Key](https://platform.openai.com/account/api-keys) or [Anthropic API Key](https://www.anthropic.com/api) to use this extension.

## Preferences

### Choose AI

Choose between Raycast AI (default), OpenAI ChatGPT or Anthropic Claude.

### Creativity

Choose how creative the AI should be.

### OpenAI API Key

Your OpenAI API Key. You can get one [here](https://platform.openai.com/account/api-keys). Necessary if you choose "OpenAI ChatGPT" as your "Choose AI" option.

### OpenAI Endpoint

Choose the OpenAI endpoint you want to use.

### OpenAI Model

Choose the model you want to use. (default: `chatgpt-4o-latest`).

### Anthropic API Key

Your Anthropic API Key. You can get one [here](https://console.anthropic.com/dashboard). Necessary if you choose "Anthropic Claude" as your "Choose AI" option.

### Anthropic Model

Choose the model you want to use. (default: `claude-3-5-sonnet-latest`).

### Language

The language you want the summary to be in. Your choice will be used in a prompt like this "Answer in english". (default: `english`).

## Using the extension with Ollama

It is possible to use the OpenAI compatible API endpoint from Ollama to summarize YouTube videos using a local LLM. To do this use the following preferences:

- Choose AI: `OpenAI ChatGPT`
- OpenAI Endpoint: `http://localhost:11434/v1/`
- OpenAI Model: `llama3.2:latest` or any other model from [Ollama's model catalog](https://ollama.com/search).
