<img src="assets/extension-icon.png" width="64" height="64" alt="Fixogram" />

# Fixogram

Fixing grammar in every message you send should not require you to switch to ChatGPT or Claude. Drop the message "Fix it, bla bla," and then wait for the response to copy back. Copy the message and just do CMD+Shift+V to paste the fixed grammar.

## How It Works

1. Copy any text to your clipboard
2. Trigger **Fixogram** with your assigned hotkey
3. The corrected text is pasted directly into your frontmost app

## Recommended Hotkey Setup

Raycast doesn't assign hotkeys automatically, so set it up once:

1. Open Raycast and search **"Fix Grammar & Paste"**
2. Hover the command → click `...` → **Add Hotkey**
3. Press `Cmd+Shift+V`

After that, `Cmd+Shift+V` works system-wide from any app.

No UI. No interruptions. Just fixed text.

## Setup

Open Raycast preferences for Fixogram and configure:

| Preference | Description |
|---|---|
| **LLM Provider** | Choose from Anthropic, OpenAI, OpenRouter, Google, Groq, or Ollama |
| **API Key** | Your API key for the selected provider |
| **Model** | Model ID to use (leave blank for provider default) |
| **Use Raycast AI** | Use Raycast's built-in AI if you have Raycast Pro (ignores provider/key) |
| **Extra Instructions** | Optional instructions appended to the prompt (e.g. "Use British English") |
| **Custom Base URL** | Override the API endpoint (useful for OpenRouter or self-hosted models) |

## Supported Providers

| Provider | Default Model |
|---|---|
| Anthropic | `claude-haiku-4-5-20251001` |
| OpenAI | `gpt-4.1-nano` |
| OpenRouter | `openai/gpt-4.1-nano` |
| Google | `gemini-2.5-flash-lite` |
| Groq | `llama-3.3-70b-versatile` |
| Ollama (local) | `llama3.2` |

You can override the model by typing any valid model ID in the **Model** preference field.

## Raycast Pro

If you have Raycast Pro, enable **Use Raycast AI** in preferences to use Raycast's built-in AI without needing an API key. You can still enter a placeholder value in the API Key field.

## Ollama (Local Models)

To use Ollama:
1. Install [Ollama](https://ollama.com) and pull a model (e.g. `ollama pull llama3.2`)
2. Select **Ollama (local)** as the provider
3. Enter any value for the API Key
4. Set the model name to match your pulled model
