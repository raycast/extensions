# Prompt Compiler Changelog

## [Store Readiness and UX Upgrade] - {PR_MERGE_DATE}

- Replaced placeholder icon with a compliant 512×512 store-ready icon
- Added selected-text prefill and explicit output modes (translation only, prompt only, or both)
- Improved provider-aware API error handling (auth, quota/rate limit, timeout, provider outage)
- Added unit tests for `src/lib/llm.ts` with mocked network responses
- Added GitHub Actions CI to enforce lint, build, and test checks
- Removed stale legacy non-extension code paths to reduce maintenance and publication risk

## [Initial Release] - {PR_MERGE_DATE}

- Translate input in any language into natural English and an LLM-ready optimized prompt
- Single API call per run (DeepSeek, Kimi, OpenAI, Anthropic, Gemini)
- Markdown output with "English Translation" and "Optimized Prompt" sections, copied to clipboard
- Provider selection and API key configuration in extension preferences
- Optional model override per provider
- Clear error handling for invalid API keys with links to get keys and open preferences
