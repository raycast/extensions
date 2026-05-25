# Changelog

## [Unreleased]

- Removed retired provider code, commands, screenshots, and documentation so the extension only presents Qwen-TTS, MiMo, and OpenAI.
- Simplified provider defaults to the active provider set and kept extension preferences focused on API keys only.
- Fixed Qwen-TTS preference typing so it uses the generated Raycast `Preferences` type directly.
- Hardened stop handling for Qwen-TTS, MiMo, and OpenAI pipelined reading by aborting in-flight synthesis when a stop request arrives.
- Hardened `AudioPlayer` cleanup so an idle player cannot remove a PID file that belongs to a different active playback process.

## [1.0.0] - 2026-05-25

- Added AI Voice Studio with Qwen-TTS, MiMo, and OpenAI text-to-speech commands.
- Added shared Quick Read, focused provider defaults, provider-specific voice pickers, status menu-bar commands, speed controls, and verification scripts.
