# Connect Mistral Provider

1. Create an API key in [Mistral Studio](https://console.mistral.ai).
2. Paste it into **Mistral API Key** in the extension preferences.
3. Enable **Allow AI Models** in the extension settings, or allow the provider from Raycast's AI model picker.
4. Run **Refresh Mistral Models**, then choose a model in AI Chat.

The catalog shows chat-capable models with a `-latest` ID available to your API key. Dated releases, archived models, Codestral, and Voxtral are excluded. Duplicate display names are grouped into one choice.

Requires Raycast 2.5 or later and Raycast Pro. Requests are sent directly to Mistral and use your Mistral account's API allowance and billing settings. This extension connects to the models, not the Vibe CLI agent or its sessions.

Interrupted text answers may trigger up to two continuation requests, which can add API charges. Cancel the response to stop pending requests. Tool-call interruptions, token limits, and empty answers are reported instead of automatically continued.

If discovery fails, check your key, account access, and network connection. If a response reaches its token limit, try a shorter prompt or a new chat.
