# Emoji Append

Select text and run **Append Contextual Emoji** to add up to three relevant emoji. Set a hotkey for the command in Raycast preferences.

## Setup and privacy

Configure an OpenAI-compatible Chat Completions endpoint, API key, model and maximum number of emoji in extension preferences. Remote endpoints require HTTPS; HTTP is supported only for local services. The selected text is sent to your configured API provider, whose pricing and privacy policy apply.

The command preserves the original plain text and appends emoji. Rich-text formatting may not be preserved. If the focused app or selected text changes while the request is running, the result is copied instead of pasted. Identical selections within the same app cannot be distinguished, so keep the original selection until the request completes. Input is limited to 12,000 UTF-16 characters, with a 30-second timeout.
