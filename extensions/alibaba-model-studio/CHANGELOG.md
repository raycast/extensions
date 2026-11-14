# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Initial Version - {PR_MERGE_DATE}

- Adds Alibaba Cloud Model Studio models (Qwen, GLM, Kimi, DeepSeek, MiniMax and more) to Raycast's AI Chat, Quick AI and AI Commands via Raycast's extension AI model provider API
- Live model discovery from the platform's `/models` endpoint, enriched with titles, context windows and capabilities from models.dev (24h cache, vendor-catalog fallback for third-party GLM/Kimi/DeepSeek/MiniMax ids), with a curated fallback so the picker is never empty
- Streaming completions with thinking on/off control, tool & function calling, image attachments on vision models, and system messages
- Pay-as-you-go API keys for the International and China regions (plus any Custom HTTPS OpenAI-compatible base URL) — pay-as-you-go keys only: Token Plan and Coding Plan keys (`sk-sp-…`) are not supported
- Optional Workspace ID preference (`X-DashScope-WorkSpace`) for pay-as-you-go team/business-space accounts
- **Check Setup** command: validates a key + platform combination against the live API, can test a different combination without applying it, lists the models Raycast will receive, and deep-links to the Model Studio console
- **Show Models** command: browse the models provided to Raycast with context windows and capabilities
- **Refresh Models** command: validates the saved setup and re-fetches the model list in one step
