# MiMo TTS Changelog

## [Fix Setup Form Reset] - 2026-06-19

- Fix "Reset to Preferences" in Setup MiMo Voice Defaults: resetting now syncs the model dropdown and voice filter, so a later Save no longer silently re-saves the pre-reset model and recreates the override that was just cleared.

## [Initial Release] - 2026-06-19

- Extract MiMo TTS into a standalone Raycast extension from AI Voice Studio.
- Full MiMo-V2.5-TTS series coverage: preset voices, Voice Design (text-to-voice), Voice Clone (audio-to-voice).
- Commands: Quick Read, Read with Voice, Set Quick Read Voice, TTS Studio, Design Voice, Clone Voice, Setup Voice Defaults, Stop Reading, Speed up Reading, Slow Down Reading, Reading Status (menu-bar).
- Chunked long-text playback with look-ahead synthesis.
- Global per-session speed override (0.5×–2.0×) shared across commands.
- Style controls: opening style tags, custom tags, pace/rhythm, emotion, vocal texture, expression, performance presets, director prompt.
- Built-in voices for MiMo-V2.5-TTS (Chinese: 冰糖, 茉莉, 苏打, 白桦; English: Mia, Chloe, Milo, Dean) plus legacy MiMo-V2 voices.
