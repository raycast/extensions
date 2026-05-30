# Qwen-TTS / DashScope Official Docs Notes

- Fetched at: 2026-05-25T16:35Z.
- URLs:
  - https://help.aliyun.com/zh/model-studio/qwen-tts-api
  - https://help.aliyun.com/zh/model-studio/interactive-process-of-qwen-tts-realtime-synthesis
  - https://help.aliyun.com/zh/model-studio/qwen-tts-realtime-client-events
  - https://help.aliyun.com/zh/model-studio/qwen-tts-realtime-server-events/

## HTTP Speech Synthesizer

- Official HTTP path for Qwen-TTS is `/api/v1/services/aigc/multimodal-generation/generation`.
- Beijing base URL is `https://dashscope.aliyuncs.com/api/v1`; Singapore / international base URL is `https://dashscope-intl.aliyuncs.com/api/v1`.
- HTTP auth uses `Authorization: Bearer $DASHSCOPE_API_KEY`.
- Request body uses `model`, `input.text`, `input.voice`, and optional `input.language_type`.
- Valid `language_type` values include `Auto`, `Chinese`, `English`, `German`, `Italian`, `Portuguese`, `Spanish`, `Japanese`, `Korean`, `French`, and `Russian`.
- Current docs describe max input length as 600 characters for Qwen3-TTS Flash models and 512 tokens for Qwen-TTS models.
- `instructions` and `optimize_instructions` are scoped to the instruct-flash family.
- Return audio can appear as base64 `audio.data` or a 24-hour `audio.url`.

## Realtime WebSocket

- Official realtime WebSocket path is `/api-ws/v1/realtime?model=...`.
- Mainland URL: `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime`.
- International URL: `wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime`.
- WebSocket auth header uses `Authorization: Bearer <your_api_key>`. Invalid or missing keys fail the handshake with HTTP 401/403.
- Official client flow: connect, receive `session.created`, send `session.update`, append input with `input_text_buffer.append`, trigger synthesis with `input_text_buffer.commit`, receive `response.audio.delta` chunks until `response.audio.done`, then send `session.finish` and wait for `session.finished`.
- `session.update` supports `voice`, `mode`, `language_type`, `response_format`, `sample_rate`, and instruct-only `instructions` / `optimize_instructions`.
- Realtime `response_format` supports `pcm`, `wav`, `mp3`, and `opus`; Qwen-TTS-Realtime models are documented as PCM-only.
- Realtime `sample_rate` supports 8000, 16000, 24000, and 48000 in general; Qwen-TTS-Realtime models are documented as 24000-only.
- Server event docs define `response.audio.delta`, `response.audio.done`, `response.done`, `session.finished`, and `error` among the relevant events.
