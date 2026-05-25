# AI Translate Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Initial local Raycast extension with selected-text translation, screenshot OCR translation, and configurable AI providers.
- Split screenshot OCR into an interactive extraction command and a screenshot translation command.
- Removed MinerU OCR and kept API OCR focused on Baidu OCR, with local Vision and Tesseract options.
- Added Xiaomi MiMo provider and refreshed DeepSeek and Kimi defaults from provider docs.
- Collapsed DeepSeek, Xiaomi MiMo, and Kimi to a single Anthropic-compatible API key/base URL/model entry each.
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
- Added a Google Gemini multimodal OCR engine that reuses the configured Gemini key, with automatic fallback to local Vision.
- Added an OpenAI Vision OCR engine that reuses the configured OpenAI key, with an optional OCR-specific model override.
- Added Auto-Copy: the Screenshot OCR result is copied to the clipboard automatically, with a copied/word-count confirmation (toggle in preferences).
- Added a Clear Text action to Screenshot OCR for discarding a result without further steps.
- Rebuilt Auto Paragraph so wrapped OCR lines reflow into real paragraphs instead of one paragraph per line, with CJK-aware joining and de-hyphenation.
- Replaced empty "OCR Failed" alerts with classified, self-describing messages: silent on a cancelled capture, actionable on an unreadable one, with a one-click Screen Recording shortcut and diagnostic detail.
- Made model errors actionable across providers: an unavailable model now explains how to switch tier or set a custom model instead of a raw 400.
- Stopped reasoning models (o-series, GPT-5 family) from failing translation by sending the correct token and temperature parameters.
- Fell back to clipboard text when nothing is selected in Translate and Rewrite & Coach, and clarified the no-selection guidance for the paste-in-place commands.
- Expanded the target language list (Arabic, Hindi, Vietnamese, Thai, Indonesian, Turkish, Dutch, Polish).
- Serialized history writes so rapid copies no longer drop entries, and cleaned up leftover TTS audio files.
- Refreshed Store screenshots for the current Screenshot OCR, Translate, and Translation Settings commands.
- Added Qwen-TTS as the default Read Aloud engine through DashScope, switchable per session in Rewrite & Coach (⌘⌥M), with model, voice, language_type, and instruct-only style instruction preferences.
- Locked Rewrite & Coach to the Pro tier so rewrite quality stays consistent regardless of the translation Model Tier setting.
- Refreshed the Xiaomi MiMo model catalog: removed the deprecated mimo-v2-flash, kept mimo-v2.5 as Fast, and promoted mimo-v2.5-pro as Pro.
- Hardened the Rewrite & Coach JSON parser with balanced-brace extraction and a more informative error message when a provider returns malformed JSON.
- Switched Screenshot OCR Copy cancellation detection to use `instanceof OcrCancelledError` so unrelated errors aren't silently swallowed.
