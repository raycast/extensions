# Changelog

## [Provider and Writing Improvements] - 2026-09-25

- Added provider and model selection to the command and saved presets.
- Added a searchable OpenRouter model catalog with manual model ID fallback.
- Added a history saving preference and cancellation for active generation requests.
- Improved generation progress and provider error handling.
- Added a comparison view with highlighted wording changes and full original/result text.
- Warned on provider-reported cut-off responses and stopped automatic copy/history for partial results.
- Moved history to an encrypted file with migration from the previous LocalStorage entry.

## [Initial Release] - 2026-03-27

- Initial public release of Text Enhance.
- Added the main `Enhance Text` command for rewriting selected text or clipboard text with Raycast AI.
- Added named presets, remembered settings, and provider-aware model selection.
- Added `Enhancement History` for browsing, copying, and clearing saved generations.
- Added paste, regenerate, and correction flows after generation.
