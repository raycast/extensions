# OpenAI Audio Speech Official Docs Notes

- Fetched at: 2026-05-25T16:35Z.
- URLs:
  - https://platform.openai.com/docs/guides/text-to-speech
  - https://developers.openai.com/api/docs/api-reference/audio/createSpeech
  - https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- Note: the old `platform.openai.com/docs/api-reference/audio/createSpeech` scrape returned 404; the current guide links to the `developers.openai.com` API docs. Method details were also checked through the official OpenAI developer docs API reference.

## Speech Endpoint

- Endpoint: `POST https://api.openai.com/v1/audio/speech`.
- The guide examples use `model: "gpt-4o-mini-tts"`, `voice`, `input`, and optional `instructions`.
- Official API reference lists max input length as 4096 characters.
- Current documented TTS models include `gpt-4o-mini-tts`, `gpt-4o-mini-tts-2025-12-15`, `tts-1`, and `tts-1-hd`.
- The guide recommends `gpt-4o-mini-tts` for steerable realtime-style text-to-speech and says it can be prompted for accent, emotional range, intonation, speed, tone, whispering, and related speech features.
- `instructions` are not supported by the older `tts-1` and `tts-1-hd` models.

## Voices And Formats

- Built-in Speech API voices currently listed by the guide: `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse`, `marin`, and `cedar`.
- The guide recommends `marin` or `cedar` for best quality.
- Supported response formats include `mp3`, `opus`, `aac`, `flac`, `wav`, and `pcm`.
- The guide recommends `wav` or `pcm` for fastest response times.
- Official `pcm` output is raw 24 kHz, 16-bit signed, little-endian audio without a WAV header.
- The Speech API supports streaming with chunk transfer encoding, allowing playback before the full file is generated.
- OpenAI policy guidance requires clear disclosure that the heard TTS voice is AI-generated.
