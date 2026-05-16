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
- Added the Rewrite & Coach command: rewrite selected text into natural, idiomatic English, compare it with the original, read a Simplified Chinese explanation of why it sounds more natural, and hear either version aloud with Gemini TTS.
- Made Rewrite & Coach editable with an inline form, tone presets (Natural / Casual / Formal / Concise via ⌘Y), and on-the-fly provider switching (⌘M).
- Added the Translate Selection & Paste and Rewrite & Replace no-view commands that act on the selected text with the default provider and paste in place, ideal for global hotkeys.
- Added the History command: locally stored recent translations and rewrites you copied or pasted, with replay copy, paste, and read aloud.
- Added a Read Aloud Voice preference (eight Gemini voices), a read-slowly action (⌘⌥S) for language practice, and stopped overlapping TTS playback so a new read cancels the previous one.
- Defaulted the Gemini model and Fast/Pro tiers to Gemini 3.1.
- Addressed review feedback for auto language detection, OCR API error parsing, provider cleanup, and search debounce latency.
- Hardened OCR retry state, auto-paragraph formatting, TTS playback, and provider configuration error handling.
- Fixed Kimi Code defaults, OCR helper build portability, screenshot capture error reporting, and numeric preference fallbacks.
