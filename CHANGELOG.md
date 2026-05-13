# AI Shell Smith Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Convert natural language prompts into shell commands via Raycast
- Multi-provider support: OpenAI (gpt-5.4-nano, gpt-5.4-mini), Perplexity (sonar-pro), Ollama (gpt-oss:20b-cloud, gpt-oss:120b-cloud)
- Optional GPT-5 Search web grounding (OpenAI)
- Optional Context7 integration for up-to-date library documentation
- Custom OpenAI-compatible endpoints and self-hosted Ollama support
- In-memory LRU cache with 60s TTL for repeated prompts
- Persistent command history with delete shortcut
- Keyboard shortcuts: Copy (`⌘↩`), Execute in Terminal (`⌘T`), Delete from History (`⌘⇧X`), Change Provider (`⌘L`)
- Standalone CLI binary (`aishellsmith`) for shell integration
