# OpenCode AI

Use [OpenCode Zen](https://opencode.ai/zen) and [OpenCode Go](https://opencode.ai/docs/go/) models in Raycast — as models in AI Chat, Quick AI, and AI Commands, and through the standalone **Ask OpenCode AI** command.

## Setup

1. Get an API key from [opencode.ai/auth](https://opencode.ai/auth).
2. Open the extension's preferences in Raycast and paste it into **OpenCode API Key**.
3. Check **Zen Models** and/or **Go Models** (Go uses the same key; uncheck it if you don't subscribe).
4. Optionally set **Default Model** (defaults to `go/gpt-6-luna`; Go models use the `go/` prefix).

## Features

- **AI Chat / Quick AI / AI Commands** — every model enabled on your account appears (Go models are labeled `(Go)`) in Raycast's model picker (free-tier models are hidden — Zen only serves them inside the OpenCode app).
- **Ask OpenCode AI** — a standalone command with its own conversation history: ask, follow up in the same thread, copy questions/answers/whole conversations.

## Notes

- Go requests carry an `x-opencode-session` header derived from the conversation's first message, as Go requires.
- Requests go to each model family's native Zen endpoint: Anthropic `/messages` (Claude, Qwen), Google (Gemini), OpenAI `/responses` (GPT, Grok, Muse), OpenAI `/chat/completions` (everything else).
- Your API key is stored only in Raycast's encrypted preferences and is sent solely to `https://opencode.ai`.
