# Grammar Fixer Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Added
- Fix grammar, spelling, and punctuation of selected text in-place via a single hotkey (`Cmd+Shift+G` on macOS, `Ctrl+Shift+G` on Windows)
- Support for Anthropic, OpenAI, OpenRouter, Google, Groq, and Ollama providers
- Raycast Pro support via `AI.ask()` — no API key needed
- Custom model override via preferences
- Extra instructions field for custom prompts (e.g. "Use British English")
- Custom base URL support for OpenRouter and self-hosted endpoints
- 5-minute response cache — repeated fixes on the same text are instant
- Friendly error messages for common failures (invalid key, rate limit, quota exceeded, context too long, no text selected)
