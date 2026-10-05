# Magic Formatter

Re-spaces clipboard text into clean paragraphs while keeping bold, italics, and bullets. Paste into Gmail or Docs (rich text) or Slack and Notion (markdown).

## How to use

1. Copy the smashed-together text.
2. Open Raycast and run **Magic Formatter**.
3. Paste.

Works with no setup. The offline engine is the default if you do not add a key.

## Optional: Claude (AI engine)

If you want the AI engine for plain-text copies that lost all structure:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com).
2. In Raycast, open **Extensions → Magic Formatter** (or run the command and open its preferences).
3. Paste the key into **Anthropic API Key**.
4. Leave **Engine** on **Auto** (uses Claude when a key is set, otherwise offline), or pick **AI only** / **Offline only**.

The key stays on your Mac in Raycast preferences. It is never committed to this repo.
