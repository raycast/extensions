# Muse AI

Use Meta's Muse Spark models in Raycast — as a model in AI Chat, Quick AI, and AI Commands, and through the standalone **Ask Muse AI** command.

## Setup

1. Get a Model API key from [dev.meta.ai](https://dev.meta.ai) (looks like `LLM|...`).
2. Open the extension's preferences in Raycast and paste it into **Model API Key**.
3. Optionally set **Muse Model** to the default model id used by `Ask Muse AI` (defaults to `muse-spark-1.3`).

## Features

- **AI Chat / Quick AI / AI Commands** — once the Model API key is set, Muse Spark models appear alongside Raycast's built-in models in the model picker.
- **Ask Muse AI** — a standalone command with its own conversation history: ask a question, keep asking follow-ups in the same thread, and copy questions/answers/whole conversations.

## Notes

- Only `muse-spark-*` text models are exposed; image, voice, and other non-chat models from the Meta Model API are not supported.
- Your Model API key is stored only in Raycast's encrypted preferences and is sent solely to `https://api.meta.ai`.
