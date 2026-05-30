# AI Voice Studio Audit Findings

Sources were checked against the official docs summarized under `audit/docs/`. Findings are sorted by severity. `applied` means a minimal source patch was already made and re-verified.

## [high] Qwen Realtime sends `session.finish` before `response.audio.done`
- 现象 / 风险: Qwen Quick Read defaults to realtime whenever `toRealtimeModel(options.model)` succeeds, but the WebSocket client sends `session.finish` immediately after `input_text_buffer.commit`. The official flow places `session.finish` after audio has streamed through `response.audio.done`. On longer text, weak networks, or stricter server behavior, this can prematurely close synthesis, hide protocol errors, or make completion timing flaky.
- 证据: `src/qwen-quick-read.tsx:74`, `src/qwen-quick-read.tsx:104`, `src/api/qwen-tts-realtime.ts:120`, `src/api/qwen-tts-realtime.ts:135`, `src/api/qwen-tts-realtime.ts:149`, `src/api/qwen-tts-realtime.ts:165` + https://help.aliyun.com/zh/model-studio/interactive-process-of-qwen-tts-realtime-synthesis + https://help.aliyun.com/zh/model-studio/qwen-tts-realtime-server-events/
- 复现路径（用户最可能怎么遇到）: 设置 Qwen 默认模型为 `qwen3-tts-flash`，选中一段较长中文，运行 Quick Read；在服务器先返回部分 `response.audio.delta` 后，连接完成语义可能与官方流程不一致。
- 建议改法（最小 diff，必要时贴 patch）: Remove the immediate `session.finish` send after commit; add a `response.audio.done` case that sends `session.finish`; keep `session.finished` as the final success signal. Add a small mock WebSocket verification covering `session.update -> append -> commit -> audio.done -> session.finish -> session.finished`.
- 不改的代价: Realtime path remains the riskiest runtime surface and can fail in ways the current HTTP fallback will not catch once any audio has started.

## [high] MiMo Token Plan terms may not fit a general Store TTS extension
- 现象 / 风险: The extension is explicitly positioned around MiMo Token Plan keys and default Token Plan cluster URLs. Xiaomi's Token Plan page frames the quota as for programming tools and prohibits clearly non-coding automated scripts or custom app backends. A Raycast Store reading extension can be used on arbitrary selected/clipboard text, so the current wording and defaults create a provider-terms review risk.
- 证据: `src/api/mimo-tts.ts:13`, `src/api/mimo-tts.ts:41`, `src/api/mimo-tts.ts:46`, `package.json:184`, `README.md:8`, `README.md:43` + https://platform.xiaomimimo.com/docs/en-US/tokenplan/subscription + https://platform.xiaomimimo.com/docs/usage-guide/speech-synthesis-v2.5
- 复现路径（用户最可能怎么遇到）: Store user installs extension, enters a `tp-...` key, and reads non-coding articles or arbitrary clipboard text through MiMo.
- 建议改法（最小 diff，必要时贴 patch）: Before Store submission, either support the regular official MiMo API base URL/key path for non-Token-Plan usage, or add explicit README/preference copy limiting Token Plan usage to eligible scenarios. Do not silently market Token Plan as a general-purpose TTS backend.
- 不改的代价: Store review or provider compliance objections can appear after implementation is otherwise technically correct.

## [high, applied] Qwen Realtime WebSocket auth used lowercase `bearer`
- 现象 / 风险: The official WebSocket handshake documents `Authorization: Bearer <your_api_key>`. The code used lowercase `bearer`, which can fail against strict gateways with 401/403 before any audio is produced.
- 证据: `src/api/qwen-tts-realtime.ts:55`, `audit/quick-wins.diff` + https://help.aliyun.com/zh/model-studio/interactive-process-of-qwen-tts-realtime-synthesis
- 复现路径（用户最可能怎么遇到）: Quick Read with Qwen on a strict DashScope edge would wait for WebSocket failure and fall back to HTTP, making realtime appear broken.
- 建议改法（最小 diff，必要时贴 patch）: Applied one-line patch: `bearer` -> `Bearer`.
- 不改的代价: Realtime would be fragile or unavailable depending on the server's auth parser.

## [medium] PCM streaming `afplay` spawn error path leaves stale PID state
- 现象 / 风险: The non-PCM `playAudio` error handler clears `currentPid` and removes the PID file, but the PCM streaming handler only clears process refs and rejects the promise. If `afplay` fails to spawn or errors during Qwen realtime PCM playback, the global PID file can remain stale until later cleanup or stop logic.
- 证据: `src/utils/audio-player.ts:76`, `src/utils/audio-player.ts:83`, `src/utils/audio-player.ts:216`, `src/utils/audio-player.ts:232`, `src/utils/audio-player.ts:235` + https://help.aliyun.com/zh/model-studio/qwen-tts-realtime-client-events + https://developers.raycast.com/information/lifecycle
- 复现路径（用户最可能怎么遇到）: Qwen realtime receives PCM, but `afplay` errors while starting a PCM WAV chunk; menu/status/stop actions can see stale playback coordination.
- 建议改法（最小 diff，必要时贴 patch）: Mirror the non-PCM error cleanup in the PCM handler: if `currentPid === myPid`, clear it and call `removePidFileIfMatch(myPid)` before rejecting. Add one `verify:audio-player` case for PCM spawn errors.
- 不改的代价: A rare playback error can leave cross-command state inconsistent, especially around Stop Reading.

## [medium] OpenAI exposes `opus` via an external `ffmpeg` dependency and omits official `pcm`
- 现象 / 风险: OpenAI docs support `mp3`, `opus`, `aac`, `flac`, `wav`, and `pcm`, and recommend `wav` or `pcm` for fastest response. The extension omits `pcm`, while allowing `opus` only by shelling out to `ffmpeg`, which Raycast/macOS users may not have.
- 证据: `src/api/openai-types.ts:3`, `src/constants/openai-voices.ts:5`, `src/utils/provider-settings.ts:253`, `src/components/provider-setup-form.tsx:575`, `src/components/provider-setup-form.tsx:579`, `src/utils/audio-player.ts:254`, `src/utils/audio-player.ts:257` + https://platform.openai.com/docs/guides/text-to-speech
- 复现路径（用户最可能怎么遇到）: User selects OpenAI Opus in advanced settings on a clean Mac without `ffmpeg`; playback fails after synthesis. Conversely, a user looking for fastest raw PCM cannot select it.
- 建议改法（最小 diff，必要时贴 patch）: For Store safety, remove `opus` from the default UI until external dependency handling is acceptable, or keep it but make the dependency warning impossible to miss. Do not add `pcm` until the OpenAI path can wrap/play raw 24 kHz PCM like the Qwen PCM path.
- 不改的代价: User-facing playback failures and a possible Store-review complaint about a hidden external binary dependency.

## [low] README says Qwen uses only non-realtime HTTP while code defaults to realtime
- 现象 / 风险: README describes Qwen integration as non-realtime HTTP, but `qwen-quick-read` now tries realtime first for Qwen3 models. The user-facing docs no longer match runtime behavior.
- 证据: `README.md:50`, `src/qwen-quick-read.tsx:74`, `src/qwen-quick-read.tsx:104` + https://developers.raycast.com/basics/prepare-an-extension-for-store + https://help.aliyun.com/zh/model-studio/interactive-process-of-qwen-tts-realtime-synthesis
- 复现路径（用户最可能怎么遇到）: Reviewer or user reads README, expects HTTP-only Qwen, then sees realtime connection/fallback behavior in use.
- 建议改法（最小 diff，必要时贴 patch）: After fixing the realtime protocol ordering, update README to say Qwen Quick Read tries realtime for Qwen3 models and falls back to HTTP before first audio.
- 不改的代价: Documentation drift makes the new realtime surface harder to review and support.

## [low] `@raycast/api` is not at the latest published version
- 现象 / 风险: Store docs ask for the latest Raycast API version. The project uses `^1.104.16`; the current npm version checked during audit is `1.104.18`.
- 证据: `package.json:209`, `audit/baseline.md` + https://developers.raycast.com/basics/prepare-an-extension-for-store
- 复现路径（用户最可能怎么遇到）: Store review flags dependency freshness even though build/lint currently pass.
- 建议改法（最小 diff，必要时贴 patch）: Run `npm install @raycast/api@^1.104.18`, review lockfile diff, then rerun `npm run verify`.
- 不改的代价: Likely a review nit rather than a runtime bug.

## Checked Surfaces Without New Findings

- Qwen HTTP contract: endpoint, Bearer auth, `input.text`, `input.voice`, `language_type`, instruct-only fields, and 500-char chunking are aligned with the current docs' 600-character Qwen3 Flash limit.
- MiMo request shape: target synthesis text is placed in an `assistant` message, `api-key` header is used, and the V2.5 built-in voice list matches the current docs.
- OpenAI fixed `gpt-4o-mini-tts` path: current built-in voices include `marin` and `cedar`, and `instructions` are only used with the fixed supported model.
- Raycast no-view selected-text fallback: provider quick-read utilities catch `getSelectedText` errors and fall back to `Clipboard.readText`.
- Raycast menu-bar interval: `1m` is the documented minimum and is valid. The status commands read only LocalStorage and preferences, not provider APIs.
- Credentials: no production source path writes API keys to temp files. Verification scripts use fake keys and include redaction checks.
- Store assets: light/dark icons are 512x512 PNG; metadata screenshots are 2000x1250 PNG; `license`, `platforms`, `categories`, `CHANGELOG`, and README are present.
