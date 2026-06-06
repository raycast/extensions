# Responsay Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Analyze selected English text for stress, sentence prominence, intonation (rising/falling tones), rhythm, and connected-speech linking
- Stress & Intonation + Rhythm visualization with General American IPA
- Single word selected → generates a natural example sentence to practice
- Neural TTS model reading via OpenAI (`gpt-4o-mini-tts`) or Qwen (`qwen3-tts-flash`), with slow playback and instant repeat
- Switch analysis provider on the fly, including updated built-in MiniMax M3 support through the Anthropic-compatible endpoint
- Reframed the standalone expression commands as Say Selection in English, Say Clipboard in English, and Say What I Mean; they now target English directly and include a Practice This English action that opens the pronunciation lesson.
- Folded the former Rewrite & Coach role into Responsay as Expression Coach: generated English now carries a short Why This Works coaching note and tone presets for Natural, Casual, Formal, and Concise output.
- Renamed the expression result surface, metadata, and action sections around Expression Coach / Coach Provider / Coach Model so expression, pronunciation, practice voice, and comprehension translation stay visually separate.
- Added SkillOpt-style validation gates to the expression and pronunciation-analysis prompts so built-in prompts check schema, fidelity, naturalness, speakability, and coaching usefulness before responding.
- Updated the selectable Qwen Coach strong model from `qwen3.6-plus` to `qwen3.7-plus`, with `qwen3.7-max` available alongside it; Qwen-TTS remains on the separate DashScope models.
- Renamed top-level preferences around Default Coach Provider, Default Voice Provider, and Practice Translation Target so setup follows the app's expression/pronunciation workflow instead of generic translation wording.
- Expose MiniMax's analysis model in preferences so `MiniMax-M3` and `MiniMax-M2.7-highspeed` are visible next to the MiniMax endpoint
- Default MiniMax speech synthesis to `speech-2.8-hd` while keeping `speech-2.8-turbo` available as a selectable fallback
- Manual text input fallback when nothing is selected
