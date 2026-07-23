# Polish Text

Rewrite text into clearer, friendlier phrasing using your own AI provider API key.

## Setup

This extension is bring-your-own-key (BYOK): it calls the AI provider directly using a key you provide, and never sends your key or text anywhere else.

1. Get an API key from one of the supported providers:
   - [OpenAI](https://platform.openai.com/api-keys)
   - [Anthropic](https://console.anthropic.com/settings/keys)
   - [OpenRouter](https://openrouter.ai/keys)
2. Open the **Polish Text** command in Raycast. If no key is configured yet, you'll be prompted to open extension preferences.
3. In preferences, choose your **AI Provider** and paste your **API Key**. Only one provider is active at a time.

## Usage

1. Highlight some text anywhere on your Mac (or leave nothing selected), then run **Polish Text**.
2. A form opens with the text field pre-filled from your selection, if any. Review or edit it, then submit.
3. The result screen shows both the original and polished text side by side.
   - Press **Enter** to paste the polished text over your original selection.
   - Use **Copy to Clipboard** to copy just the polished text instead (useful when there was nothing to paste over, e.g. the text was typed rather than selected).
