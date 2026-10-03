# Petal Changelog

## [Latest History First and Live Model List] - {PR_MERGE_DATE}

- `Search History` now selects the newest transcription each time it opens
- `Switch Model` reads the model list from Petal, so new models and download status show up without an extension update
- Updated the built-in model list to Petal's current models, with an NVIDIA icon for Parakeet
- `Switch Model` shows your saved model even when Petal no longer offers it

## [Initial Version] - 2026-03-10

- Added `Start Recording` command (`petal://start`)
- Added `Stop Recording` command (`petal://stop`)
- Added `Search History` command with copy/paste and file actions
- Added `Select Model` command (writes `selected_model_id` and optional `petal://setup`)

## [Improvements] - 2026-03-10

- Added `Copy Last Transcription` command
- Added configurable `History Directory` and `Models Directory` preferences
- Updated model command copy to `Switch Model`
- Added provider logos for model/history rows (Qwen, Voxtral, Whisper, Apple)
- Removed per-item `Copy Latest Transcript` action from history rows
