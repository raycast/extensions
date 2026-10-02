# Changelog

## Initial Version - {PR_MERGE_DATE}

- Adds Z.ai and BigModel GLM models to Raycast's AI Chat, Quick AI and AI Commands via Raycast's extension AI model provider API
- Live model discovery from the platform's `/models` endpoint, enriched with titles, context windows and capabilities from models.dev (24h cache), with a curated fallback so the picker is never empty
- Streaming completions with thinking / reasoning-effort control, tool & function calling, image attachments on vision models, and system messages
- Pay-as-you-go API keys for Z.ai or BigModel (plus any Custom HTTPS OpenAI-compatible base URL)
- **Check Setup** command: validates a key + platform combination against the live API, can test a different combination without applying it, and deep-links to the platform's API-keys console
- **Refresh Models** command: validates the saved setup and re-fetches the model list in one step
