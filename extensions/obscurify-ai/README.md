# Obscurify.ai for Raycast

Adds [Obscurify.ai](https://obscurify.ai/?utm_source=raycast) models to the Raycast AI model picker, so you can use them in AI Chat, Quick AI and AI Commands.

Obscurify.ai is a privacy-focused AI service with an OpenAI-compatible API to 200+ models (GPT, Claude, Gemini, DeepSeek, Qwen, Llama, Mistral and more). Text requests only use zero-data-retention routes, prompts and responses aren't stored on its servers, and accounts are a random account number with no email.

## Setup

1. Create an account at [obscurify.ai](https://obscurify.ai/?utm_source=raycast) and add a balance. The API works on every plan with a positive balance.
2. Click **Show API Key** on [obscurify.ai/account](https://obscurify.ai/account) and copy the `sk-obs1_...` key.
3. Install the extension, open the model picker in AI Chat, pick **Obscurify.ai** and choose **Allow**, then paste the key.

Using models from extensions needs Raycast Pro. Requests go from the extension straight to `https://obscurify.ai/v1` and don't use Raycast AI credits.

## Features

- The live model list from `https://obscurify.ai/v1/models`, with context windows
- Streaming replies
- Tool calling (AI Extensions and MCP) on models that support it
- Reasoning effort (low, medium, high) on models that reason
- **Show Models** lists every model with its context window and price; **Refresh Models** updates the picker

Which models you can use depends on your plan: frontier models need Casual or Pro, uncensored models need Pro. Prices per model: [obscurify.ai/model_cards](https://obscurify.ai/model_cards?utm_source=raycast).

