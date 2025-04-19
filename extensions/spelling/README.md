# Spelling

<p align="center">
  <img src="assets/extension-icon.png" height="128">
  <h1 align="center">AI Spelling Corrector</h1>
</p>

A raycast extension that corrects selected text

## Commands

- Spelling: Fixes the selected text's spelling and grammar.

## Preferences

Configure the extension via `Raycast Settings > Extensions > Spelling`.

| Property   | Label       | Type   | Required | Description                                                    |
| ---------- | ----------- | ------ | -------- | -------------------------------------------------------------- |
| `apiKey`   | API Key     | string | true     | Your personal LLM API key                                       |
| `model`    | LLM Model   | string | true     | LLM model name                                                  |
| `url`      | LLM URL     | string | false    | LLM service endpoint (e.g., <https://api.scaleway.ai/v1>)       |

