# Kesha Voice Kit Changelog

## [Initial Version] - {PR_MERGED_AT}

- Add **Transcribe Selected Audio** command — transcribes the audio file selected in Finder using the local `kesha` CLI, shows transcript + detected language, pre-copies to clipboard.
- Add **Speak Clipboard** command — synthesizes the current clipboard text via `kesha say` and plays it through the default output; voice auto-routed by detected language (Kokoro for English, Piper for Russian, AVSpeech for macOS system voices).
- Preferences for overriding the `kesha` binary path and default voice.
