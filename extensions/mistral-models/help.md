# Connect Mistral Provider

Requires Raycast 2.5 or later and Raycast Pro. Mistral bills requests against your API account.

1. Create an API key in [Mistral Studio](https://console.mistral.ai).
2. Enter it in the Mistral API Key password field.
3. Enable Allow AI Models.
4. Run Refresh Mistral Models.
5. Choose a model in AI Chat.

The catalog lists chat models with a `-latest` ID. It excludes dated releases, archived models, Codestral, and Voxtral, and groups duplicate names.

Interrupted text answers can trigger up to two continuation requests with additional API charges. Cancel the response to stop active requests. The extension reports tool-call interruptions, token limits, and empty answers without requesting continuations.

If discovery fails, check your key, account access, and network connection. If a response reaches its token limit, try a shorter prompt or a new chat.
