# Handy Changelog

## [Fix Model Discovery] - 2026-07-12

### Fixed

- **Select Model** now finds Handy's built-in models again. Since Handy adopted transcribe.cpp, models download through the HuggingFace hub cache (`~/.cache/huggingface/hub`) rather than `Application Support/com.pais.handy/models`, so the list always showed "No models downloaded". Model discovery now scans the HuggingFace cache (respecting `HF_HOME` / `HF_HUB_CACHE`), matches each downloaded GGUF against Handy's model catalog for names and language capabilities, and still surfaces custom models from the legacy directory.

### Added

- GGUF quantisation (e.g. `Q8_0`) is shown as a tag in the model list, so multiple downloaded quants of the same model are distinguishable.

## [1.1.0] - 2026-03-19

### Added

- **Select Language** — set the transcription language for the active model; the list is automatically filtered to languages supported by the selected model (e.g. 4 languages for Canary 180M Flash, 7 for SenseVoice), with an error shown for models that don't support language selection (Parakeet, Moonshine, GigaAM)

### Changed

- Updated screenshots

## [Initial Release] - 2026-03-19

### Added

- **Search Transcripts** — browse full transcription history with detail pane, copy to clipboard, toggle saved, delete, and reveal recording in Finder
- **Copy Last Transcript** — instantly copy the most recent transcription to clipboard
- **Toggle Recording** — toggle Handy's recording from Raycast
- **Add Dictionary Word** — quickly add a word to Handy's custom dictionary
- **Manage Dictionary** — view, add, and delete custom dictionary words
- **Select Model** — switch the active transcription model from downloaded models
- **Open Recordings Folder** — open the recordings directory in Finder
