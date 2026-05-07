# Kesha Voice Kit Changelog

## [Initial Version] - {PR_MERGED_AT}

- Add **Transcribe Selected Audio** command — transcribes the audio file selected in Finder using the local `kesha` CLI, shows transcript + detected language, pre-copies to clipboard.
- Add **Speak Clipboard** command — synthesizes the current clipboard text via `kesha say` and plays it through the default output; voice auto-routed by detected language (Kokoro for English, Piper for Russian, AVSpeech for macOS system voices).
- Preferences for overriding the `kesha` binary path and default voice.
- Auto-detect the `kesha` binary across the well-known global install locations (`~/.bun/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `~/.npm-global/bin`, `~/.local/bin`). Raycast launches without the user's shell PATH, so a bare lookup of `kesha` would otherwise fail with `exitCode=127`.
- Add **Stop Speech** command — a no-view kill switch for in-flight playback from Speak Clipboard. Bind a global hotkey to interrupt mid-sentence.
- Speak Clipboard now picks the highest-quality voice the user has staged: Kokoro (`en-am_michael`) for English when its model is present in `~/.cache/kesha/models/kokoro-82m/`, Vosk-TTS (`ru-vosk-m02`) for Russian when `~/.cache/kesha/models/vosk-ru/` is present. Falls back to AVSpeech (`Samantha` / `Milena`) automatically when those models haven't been installed via `kesha install --tts`. Override via the `Default voice` preference.
