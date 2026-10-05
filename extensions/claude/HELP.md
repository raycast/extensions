# Setting up Claude

## Get an API key

1. Sign in at [platform.claude.com](https://platform.claude.com).
2. Open **Settings → API Keys** and create a key.
3. Paste it into the **API Key** field.

The key is billed to your Anthropic account, separately from any Claude.ai or Raycast subscription. Usage is charged per token; see [Anthropic's pricing](https://www.anthropic.com/pricing#api) for current rates.

## Use Claude in Raycast AI

This extension can also add your Claude models — and each of your saved Presets — to Raycast AI's model picker, so you can use them in AI Chat, Quick AI, and AI Commands on your own key.

- It requires **Raycast Pro**.
- Turn it on with **Allow AI Models** in this extension's settings, or by choosing one of its models in the picker.

A Preset appears in the picker under its own name and applies its system prompt, model, and output limit when you select it. New or edited Presets show up the next time Raycast refreshes the list successfully.

## Stream Responses

This applies to the **Ask Question** command. Leave it on unless you have a reason not to: with it off, an answer appears only once it is complete, and very long answers are capped shorter. Raycast AI always streams, whatever this is set to.
