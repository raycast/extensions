# Xiaomi MiMo Official Docs Notes

- Fetched at: 2026-05-25T16:35Z.
- URLs:
  - https://platform.xiaomimimo.com/docs/usage-guide/speech-synthesis-v2.5
  - https://platform.xiaomimimo.com/docs/en-US/tokenplan/subscription

## Speech Synthesis V2.5

- Current TTS models listed:
  - `mimo-v2.5-tts`
  - `mimo-v2.5-tts-voicedesign`
  - `mimo-v2.5-tts-voiceclone`
- Official non-streaming example uses `POST https://api.xiaomimimo.com/v1/chat/completions`.
- Auth header in examples is `api-key: $MIMO_API_KEY`.
- The target text for synthesis must be in an `assistant` role message. Optional `user` role messages can carry style/instruction context.
- Built-in voices include Chinese presets (`冰糖`, `茉莉`, `苏打`, `白桦`) and English presets (`Mia`, `Chloe`, `Milo`, `Dean`). Treat `mimo_default` as a legacy/region-dependent value and avoid it for English defaults because the China cluster can default to a Chinese voice.
- Non-streaming examples use `audio.format: "wav"` and `audio.voice`.
- Streaming examples specify `audio.format: "pcm16"`, and the Python examples label the stream as 24 kHz PCM16LE mono.
- The docs say low-latency streaming for MiMo-V2.5-TTS is not yet available; current streaming compatibility returns the result after inference completes.

## Token Plan

- Token Plan docs describe it as a subscription plan for AI programming scenarios.
- Token Plan API keys use the `tp-xxxxx` format.
- OpenAI-compatible Token Plan cluster base URLs:
  - China: `https://token-plan-cn.xiaomimimo.com/v1`
  - Singapore: `https://token-plan-sgp.xiaomimimo.com/v1`
  - Europe: `https://token-plan-ams.xiaomimimo.com/v1`
- The Token Plan page says package quota can only be used in programming tools and prohibits API-call usage for clearly non-coding automated scripts or custom application backends. This is a Store-readiness and user-compliance risk for a general Raycast TTS extension unless the intended use is documented and constrained.
