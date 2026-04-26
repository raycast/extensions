<img src="assets/extension-icon.png" width="64" height="64" alt="Grammar Fixer" />

# Grammar Fixer

Fixing grammar in every message you send should not require switching to ChatGPT or Claude. Just select the text, hit `Cmd+Shift+G` (or `Ctrl+Shift+G` on Windows), and it's fixed in place — no copy, no paste, no context switch.

## How It Works

1. Select any text in any app
2. Trigger **Grammar Fixer** with your hotkey
3. The selected text is replaced with the corrected version instantly

No UI. No interruptions. Just fixed text.

## Recommended Hotkey Setup

Raycast doesn't assign hotkeys automatically, so set it up once:

1. Open Raycast and search **"Fix Grammar"**
2. Hover the command → click `...` → **Add Hotkey**
3. Press `Cmd+Shift+G` (macOS) or `Ctrl+Shift+G` (Windows)

After that, the hotkey works system-wide from any app.

## Setup

Open Raycast preferences for Grammar Fixer and configure:

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
