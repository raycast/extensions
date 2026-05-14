# AI Translate Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Initial local Raycast extension with selected-text translation, screenshot OCR translation, and configurable AI providers.
- Split screenshot OCR into an interactive extraction command and a screenshot translation command.
- Removed MinerU OCR and kept API OCR focused on Baidu OCR, with local Vision and Tesseract options.
- Added Xiaomi MiMo provider and refreshed DeepSeek, MiniMax, and Kimi defaults from provider docs.
- Collapsed DeepSeek, Xiaomi MiMo, MiniMax, and Kimi to a single Anthropic-compatible API key/base URL/model entry each.
- Kept OpenAI and Gemini on their native API protocols.
- Added prompt profiles and custom prompt instructions for reusable translation behavior.
- Refined the default system prompt toward native, sense-for-sense translation instead of literal wording.
- Addressed review feedback for auto language detection, OCR API error parsing, provider cleanup, and search debounce latency.
- Hardened OCR retry state, auto-paragraph formatting, TTS playback, and provider configuration error handling.
