# TranslaTone

Translate selected, typed, or clipboard text with a tone in Raycast. Run **Manage Providers** to add a provider and choose an enabled primary provider before translating.

## Commands

- **Manage Providers** adds, edits, tests, disables or removes your saved connections. Each provider type has one connection. The first enabled connection becomes primary; choose **Set as Primary** to switch.

- **Translate** opens the translation view. Selected text is translated on opening. Typed text is translated automatically after 700 ms without typing. If there is no selection, clipboard text is shown locally as a preview; choose **Translate Clipboard** to send it for translation. Clearing typed text returns to the clipboard preview, which requires that action again.
- **Translate Selection** replaces selected text using your default tone. With no selection, it opens Translate. Allow Raycast access to selected text in macOS when prompted.
- **Choose Model** lists models for a configured provider. A selected model overrides the model saved in Manage Providers; choose **Use Saved Model** to clear the override.

In Translate, select Default for a faithful, natural translation, LinkedIn for a professional message, Email for a polite structured message, or Chat for a casual message. The view remembers your last tone; Translate Selection uses **Default Tone** in preferences.

Set a **Main Language** and **Second Language** in preferences. Text detected as the main language goes to the second; other text goes to the main language. Use the **Translate To** dropdown to force a target, or press ⌘S to swap direction.

By default, Enter pastes the result into the previous app and ⌘Enter copies it. Change **Enter Key** in preferences to reverse those actions. Use ⌘R to retry or try the next provider, and ⌘M to choose a model. Review AI output before using it.

## Providers

Get an API key from [Groq](https://console.groq.com/keys), [Gemini](https://aistudio.google.com/app/apikey), [OpenAI](https://platform.openai.com/api-keys), [Anthropic](https://console.anthropic.com/settings/keys), or [OpenRouter](https://openrouter.ai/settings/keys). For a local server, install and run [Ollama](https://ollama.com) or an OpenAI-compatible application with a downloaded model.

In **Manage Providers**, choose **Add Provider**, select a type, and enter its API key and model. Known providers supply a default model. Empty required keys save the connection as disabled; add a key and enable it before use. **Disable Provider** keeps the credentials; **Remove Provider** removes the managed connection and its saved credentials and model choice.

Custom requires a base URL and exact model ID; its API key is optional. Ollama requires a running local server and model, and does not need a key. Use a base URL such as `http://localhost:1234/v1`, without `/chat/completions`, credentials, a query or a fragment. Remote endpoints require HTTPS; HTTP is allowed only for loopback addresses.

**Test Connection** sends a short synthetic prompt to that provider and model. It does not send your selection or clipboard, and may incur a provider charge. Saving a provider does not automatically test it.

Only your enabled primary provider is used by default. **Turn On Automatic Fallback** explicitly allows other enabled connections to receive the same text after recoverable failures. Invalid credentials and rejected requests surface as errors. Disabling or removing the primary stops translations until you choose another primary; it does not silently switch providers.

**Choose Model** lists enabled saved connections, including secondary providers when automatic fallback is off. A picked model overrides that connection's saved model; **Use Saved Model** clears the override. Editing or removing a connection clears its picked model.

### Updating from the earlier beta

Provider configuration has moved out of Raycast preferences. Existing beta users must re-enter provider details once in **Manage Providers**. Old preference values are not imported or used. Only language pair, default tone and Enter-key behavior remain in general preferences.

## Privacy and usage

TranslaTone has no application backend or telemetry. It sends translation requests directly to the configured provider. If you explicitly enable automatic fallback, it may send the same text to another enabled service. Check each provider's data policies before sending text. Typing, changing tone, and retries can create requests and paid charges depending on your provider and plan.

For local-only translations, choose a loopback Custom endpoint or local Ollama as primary and leave automatic fallback off, or ensure all enabled fallback connections are local. Clipboard previews are rendered as literal text so embedded Markdown images do not load before submission.

Local usage counts are approximate daily counts in UTC, not authoritative usage or spending caps. Raycast LocalStorage holds usage counters identified by a hashed key prefix and model overrides; Raycast's cached state remembers the last tone. Translations are cached in memory for the session. Clipboard content may also be retained by macOS or Raycast clipboard history outside the extension. Managed provider settings and credentials use Raycast's encrypted, extension-scoped LocalStorage. Removing a managed connection does not erase credentials retained by an older extension version in its legacy preferences; clear those with that version if needed.

If a request fails, use the toast's **Retry** or **Manage Providers** action. **Copy Debug Info** includes provider, status, and request details; known API keys and credential URLs are redacted. Review the report before sharing it in an issue.

To remove a saved model override, choose **Use Saved Model**. Disable a provider to pause it while keeping its credentials, or remove it from **Manage Providers** to remove its saved connection. There is currently no in-extension action to clear all usage counters or cached state.
