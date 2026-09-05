# Calypso Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Chat with any OpenAI-compatible endpoint from Raycast, with a primary
  endpoint, an optional fallback, and an optional cloud provider behind both.
- Multi-turn **Chat with Calypso** command: follow-ups resolve against the whole
  thread, including earlier tool results.
- Conversation history: browse, reopen, copy as Markdown and delete past chats.
- Tool calling — `web_search` via SearXNG, `rag_search` against a private
  knowledge base, and `fetch_url` via Firecrawl. Each is enabled by configuring
  its URL and silently withheld from the model when left blank.
- AI Extension: `@calypso` in Raycast AI Chat exposes the same three tools plus
  `ask-calypso`, which hands a whole question to your own model.
- One-shot **Ask** commands, either auto-selecting or pinned to one endpoint,
  and a **Status** command reporting health, loaded model and context size.
