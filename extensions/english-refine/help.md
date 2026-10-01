# Set Up Your Provider

1. Create an API key with your model provider. For OpenAI, use the [API keys page](https://platform.openai.com/api-keys).
2. Enter the key in **API Key**.
3. Set **API Base URL** to your provider's OpenAI-compatible API root. For OpenAI, keep `https://api.openai.com/v1`. For local CLIProxyAPI, use your instance's root, such as `http://127.0.0.1:8317/v1`. Do not append `/models` or `/chat/completions`.
4. Run **Refine Settings**. Choose a discovered model, effort, and mode; edit **System Prompt** if desired. Press **Command–Return** to save.
5. Assign a hotkey to **Refine Selected Text** in **Raycast Settings → Extensions → Refine**.
6. Select text in another app and press the hotkey. Refine shows native status badges and replaces the selection automatically. Keep your source app and selection in place until completion.

Models are discovered from your API automatically. Effort and Fast options appear only when the API advertises them; Normal is the default. Direct OpenAI's model list supplies no capability metadata, so it offers Provider Default effort and Normal mode. CLIProxyAPI's richer catalog supplies per-model options when available. Choose a model that supports text Chat Completions with system messages.

Your selected text and API key are sent directly to this provider. OpenAI API access is billed separately from a ChatGPT subscription.
