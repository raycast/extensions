# Summarize YouTube Video

Summarize any YouTube Video with AI and ask follow up questions to get all the details. Choose between Raycast, OpenAI ChatGPT or Anthropic Claude. You have to either be a [Raycast Pro](https://www.raycast.com/pro) Member, have access to an [OpenAI API Key](https://platform.openai.com/account/api-keys) or [Anthropic API Key](https://www.anthropic.com/api) to use this extension. Alternatively, you can use the extension with [Ollama](https://ollama.com/) to summarize YouTube videos using a local LLM.

## Preferences

### Commands

## `summarizeVideoWithRaycast`

### Preferences for Raycast

### Creativity

Choose how creative the AI should be.

### Language

The language you want the summary to be in. Your choice will be used in a prompt like this "Answer in english". (default: `english`).

## `summarizeVideoWithOpenAI`sdfjkh

### Preferences for OpenAI

### Creativity

Choose how creative the AI should be.

### OpenAI API Key

Your OpenAI API Key. You can get one [here](https://platform.openai.com/account/api-keys). Necessary if you choose "OpenAI ChatGPT" as your "Choose AI" option.

### OpenAI Endpoint

Choose the OpenAI endpoint you want to use.

### OpenAI Model

Choose the model you want to use. (default: `gpt-5-mini`).

### Language

The language you want the summary to be in. Your choice will be used in a prompt like this "Answer in english". (default: `english`).

## `summarizeVideoWithAnthropic`

### Creativity

Choose how creative the AI should be.

### Anthropic API Key

Your Anthropic API Key. You can get one [here](https://console.anthropic.com/dashboard). Necessary if you choose "Anthropic Claude" as your "Choose AI" option.

### Anthropic Model

Choose the model you want to use. (default: `claude-haiku-4-5`).

### Language

The language you want the summary to be in. Your choice will be used in a prompt like this "Answer in english". (default: `english`).

## `summarizeVideoWithOllama`

### Preferences for Ollama

### Creativity

Choose how creative the AI should be.

### Ollama Endpoint

Choose the Ollama endpoint you want to use. (default: `http://localhost:11434/v1`).

### Ollama Model

Choose one of the models from Ollama's [model catalog](https://ollama.com/search). (default: `llama3.2:latest`).

### Language

The language you want the summary to be in. Your choice will be used in a prompt like this "Answer in english". (default: `english`).

## `summarizeVideoHistory`

Every summary is stored in the local database. You can retrieve and interact with the summaries by running the `summarizeVideoHistory` command.

## Troubleshooting

### YouTube Transcript Not Working

YouTube occasionally changes its internal API, which can break transcript fetching. To diagnose whether the issue is with YouTube's API or something else, run:

```bash
npm run check:youtube-api
```

This diagnostic script tests the transcript extraction against a known video. If it fails, the YouTube API internals have likely changed and the `getVideoTranscript.ts` utility needs to be updated.
