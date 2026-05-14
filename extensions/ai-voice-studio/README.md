# AI Voice Studio - Raycast Extension

Read and generate speech from Raycast with multiple AI TTS providers.

AI Voice Studio merges the original MiniMax TTS reading workflow with Xiaomi MiMo expressive TTS and OpenAI Speech API playback. The extension is structured as a provider hub: MiniMax remains the long-form reading and voice-clone provider, MiMo adds an expressive studio with voice, style, rhythm, emotion, and pacing controls, OpenAI adds a simple `gpt-4o-mini-tts` reading path, and the manifest is ready for a future Doubao provider.

## Providers

### MiniMax

MiniMax is still the default provider because it has the most complete reading workflow in this repository:

- Quick Read from selected text or clipboard.
- Resume Last Reading and Restart Last Reading.
- Chunk-level reading progress for medium-length text.
- Next-chunk synthesis starts while the current MiniMax chunk is playing, reducing gaps in longer readings; speed changes and stop requests cancel stale lookahead audio.
- Stop during playback keeps the current chunk as the resume point, avoiding skipped text after partial playback.
- Menu-bar reading status.
- Speed controls that persist across paused readings.
- Voice selection for system, cloned, generated, and configured custom voice IDs.
- The MiniMax voice picker uses the same lookahead reading runner as Quick Read.
- Voice cloning with upload cache and preview playback.
- China and Global endpoints.
- Token Plan and Open Platform API key modes.

### MiMo

MiMo is integrated as the expressive provider:

- Quick Read with MiMo.
- Read with MiMo Voice.
- Set MiMo Quick Read Voice.
- TTS Studio for typed, selected, or pasted text.
- Natural-language speaking style prompt.
- Opening style tags, rhythm tags, emotion tags, vocal texture tags, expression tags, and custom assistant tags.
- Lookahead chunk synthesis so the next chunk can be prepared while the current chunk is playing.
- Stop requests prevent any prepared lookahead chunk from playing.
- MiMo-specific status and speed override storage.

### OpenAI

OpenAI is integrated through the Speech API:

- Quick Read with OpenAI.
- Read with OpenAI Voice.
- Set OpenAI Quick Read Voice.
- Default `gpt-4o-mini-tts` model, with `tts-1` and `tts-1-hd` as legacy options.
- Built-in OpenAI voices including `cedar`, `marin`, `coral`, `alloy`, `nova`, and `shimmer`.
- Optional speech instructions for `gpt-4o-mini-tts`.
- MP3 and WAV response formats.
- Provider-scoped status, stop, speed, and voice override storage.
- Stop requests prevent any prepared lookahead chunk from playing.

## Commands

| Command | Provider | Purpose |
| --- | --- | --- |
| Quick Read | Default provider | Read selected text or clipboard text. The provider is controlled by **Setup Voice Defaults**. |
| Setup Voice Defaults | Shared | Configure the default provider, then edit one provider's model, voice, speed, style, and format defaults at a time. |
| Test Voice Setup | Shared | Synthesize and play a short sample with the current default provider to verify API access, latency, and playback. |
| Resume Last Reading | MiniMax | Resume the previous MiniMax reading session. |
| Restart Last Reading | MiniMax | Restart the previous MiniMax reading session from the beginning. |
| Read with MiniMax Voice | MiniMax | Browse MiniMax voices and read with the selected voice. |
| Set MiniMax Quick Read Voice | MiniMax | Choose the MiniMax voice used by Quick Read when MiniMax is selected. |
| Clone MiniMax Voice | MiniMax | Upload audio and create a cloned MiniMax voice. |
| TTS Studio | MiMo | Generate MiMo speech with expressive controls. |
| Quick Read with MiMo | MiMo | Direct MiMo quick-read command, regardless of the default provider. |
| Read with MiMo Voice | MiMo | Browse MiMo voices and read with the selected voice. |
| Set MiMo Quick Read Voice | MiMo | Choose the MiMo voice used by Quick Read when MiMo is selected. |
| Quick Read with OpenAI | OpenAI | Direct OpenAI quick-read command, regardless of the default provider. |
| Read with OpenAI Voice | OpenAI | Browse OpenAI voices and read with the selected voice. |
| Set OpenAI Quick Read Voice | OpenAI | Choose the OpenAI voice used by Quick Read when OpenAI is selected. |
| Stop Reading | Shared | Stop current playback. |
| Increase Reading Speed | Shared | Increase MiniMax speed for the next segment, or MiMo/OpenAI speed for the next playback. |
| Decrease Reading Speed | Shared | Decrease MiniMax speed for the next segment, or MiMo/OpenAI speed for the next playback. |
| MiniMax Reading Status | MiniMax | Menu-bar controls for MiniMax reading sessions. |
| MiMo Reading Status | MiMo | Menu-bar controls for MiMo playback and speed. |

## Preferences

### Shared

- The extension-level Raycast Preferences sidebar stores provider API keys only.
- Use **Setup Voice Defaults** for the default provider plus MiniMax authentication mode, model, voice, speed, style, format, region, and MiMo base URL. The form shows only the provider currently being configured, so normal setup fits in the Raycast sidebar without scrolling through inactive providers.
- The same setup form is available from TTS Studio, voice pickers, clone, read, and menu-bar commands. Provider-specific entries open directly on their own provider. Saved Setup Voice Defaults override built-in defaults until reset.
- Run **Test Voice Setup** after adding an API key to call the current default provider, play a short sample, report synthesis latency plus returned audio size, and warn when the provider/playback path is unusually slow.

### MiniMax

- **MiniMax Token Plan Key**
- **MiniMax Open Platform API Key**
- MiniMax auth mode, model, voice, custom voice IDs, language boost, region, and speech rate are configured in **Setup Voice Defaults**.

### MiMo

- **MiMo Token Plan API Key**
- MiMo model, voice, speech rate, speaking style, and Token Plan base URL are configured in **Setup Voice Defaults**.

MiMo API-key preferences and LocalStorage settings intentionally use the `mimo*` prefix internally so they do not collide with MiniMax settings. A future Doubao provider should follow the same pattern with `doubao*` names.

### OpenAI

- **OpenAI API Key**
- OpenAI model, voice, response format, playback rate, and speaking instructions are configured in **Setup Voice Defaults**.

OpenAI API-key preferences and LocalStorage settings use the `openai*` prefix internally so they stay independent from MiniMax, MiMo, and future providers.

## Setup

```bash
npm install
npm run dev
```

For local verification:

```bash
npm run verify
npm run verify:runtime
npm run verify:provider-settings
npm run verify:provider-env
npm run verify:fast-paths
npm run verify:provider-contracts
npm run verify:live-smoke-guardrails
npm run verify:pipeline-lookahead
npm run verify:audio-player
npm run build
npm run lint
npx tsc --noEmit
npm audit
```

For a local macOS playback smoke test that exercises real `afplay`, run:

```bash
npm run verify:local-playback
```

This command needs normal macOS audio access. In restricted sandboxes, `afplay` can fail with `AudioQueueStart failed` even when the generated WAV is valid.

Live provider smoke tests are opt-in because they call real TTS APIs:

```bash
npm run verify:live-env
AI_VOICE_STUDIO_LIVE=1 AI_VOICE_STUDIO_PROVIDERS=openai OPENAI_API_KEY=... npm run verify:live-smoke
npm run verify:goal
```

`verify:live-env` only reports which provider keys are present and never prints the key values or calls provider APIs. Provider keys can also come from `~/.env` or project `.env`; the live flag still needs to be explicit on the command line. `MINIMAX_API_KEY` is accepted as a legacy MiniMax alias for live smoke and is routed through the HD-compatible MiniMax path unless a more specific MiniMax key is set.

`verify:live-smoke` writes the same focused setup override layer used by **Setup Voice Defaults**, then builds provider options from that setup before calling the real API.

Add `AI_VOICE_STUDIO_PLAY=1` to also play the returned audio through the shared `AudioPlayer` wrapper. Live smoke reports synthesis, playback, and total elapsed time, and the same `AI_VOICE_STUDIO_MAX_MS` limit bounds the end-to-end smoke path. Temporary audio is deleted after playback unless `AI_VOICE_STUDIO_KEEP_AUDIO=1` is set.

`verify:goal` checks fresh evidence from direct `npm run verify` and `npm run verify:local-playback` runs, then checks live-env readiness. This avoids false failures from running Raycast lint or macOS `afplay` inside a nested Node parent process. It exits non-zero until local evidence is fresh and real provider API smoke can run with available keys and `AI_VOICE_STUDIO_LIVE=1`.

## Implementation Notes

- MiniMax API: `POST /v1/t2a_v2`; audio is returned as hex MP3 and converted to base64 before playback.
- MiniMax voice lookup: `POST /v1/get_voice`.
- MiniMax voice clone: file upload plus `POST /v1/voice_clone`.
- MiMo API: `POST {MiMo Token Plan Base URL}/chat/completions`.
- MiMo audio is returned as base64 WAV.
- OpenAI API: `POST https://api.openai.com/v1/audio/speech`.
- OpenAI audio is returned as binary MP3 or WAV and converted to base64 before playback.
- API keys are stored in extension preferences. Default provider, MiniMax auth mode, provider-specific model, voice, speed, style, format, region, and base URL settings are saved through the Setup Voice Defaults form.
- Playback uses macOS `afplay`; local verification includes a silent WAV smoke test through the shared audio wrapper.
- Cross-command stop uses an `ai-voice-studio` PID file plus a stop marker so MiniMax can abort in-flight synthesis and avoid starting the next segment after a stop request.
- The shared audio player now supports MP3/WAV temp files, optional playback rate, and abort signals for lookahead synthesis.
- Provider-specific local storage keys are kept separate for voice overrides, live playback state, and speed overrides.

## Provider Extension Pattern

When adding Doubao, keep it provider-scoped:

- `src/api/doubao-tts.ts`
- `src/api/doubao-types.ts`
- `src/constants/doubao-voices.ts`
- `src/utils/doubao-*`
- `doubao*` preference or LocalStorage setting names
- direct provider commands first, then wire shared Quick Read after the provider is stable
