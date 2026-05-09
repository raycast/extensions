# AI Voice Studio - Raycast Extension

Read and generate speech from Raycast with multiple AI TTS providers.

AI Voice Studio merges the original MiniMax TTS reading workflow with Xiaomi MiMo expressive TTS. The extension is now structured as a provider hub: MiniMax remains the long-form reading and voice-clone provider, MiMo adds an expressive studio with voice, style, rhythm, emotion, and pacing controls, and the manifest is ready for a future Doubao provider.

## Providers

### MiniMax

MiniMax is still the default provider because it has the most complete reading workflow in this repository:

- Quick Read from selected text or clipboard.
- Resume Last Reading and Restart Last Reading.
- Chunk-level reading progress for medium-length text.
- Menu-bar reading status.
- Speed controls that persist across paused readings.
- Voice selection for system, cloned, generated, and configured custom voice IDs.
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
- MiMo-specific status and speed override storage.

## Commands

| Command | Provider | Purpose |
| --- | --- | --- |
| Quick Read | Default provider | Read selected text or clipboard text. The provider is controlled by **Default TTS Provider**. |
| Resume Last Reading | MiniMax | Resume the previous MiniMax reading session. |
| Restart Last Reading | MiniMax | Restart the previous MiniMax reading session from the beginning. |
| Read with MiniMax Voice | MiniMax | Browse MiniMax voices and read with the selected voice. |
| Set MiniMax Quick Read Voice | MiniMax | Choose the MiniMax voice used by Quick Read when MiniMax is selected. |
| Clone MiniMax Voice | MiniMax | Upload audio and create a cloned MiniMax voice. |
| TTS Studio | MiMo | Generate MiMo speech with expressive controls. |
| Quick Read with MiMo | MiMo | Direct MiMo quick-read command, regardless of the default provider. |
| Read with MiMo Voice | MiMo | Browse MiMo voices and read with the selected voice. |
| Set MiMo Quick Read Voice | MiMo | Choose the MiMo voice used by Quick Read when MiMo is selected. |
| Stop Reading | Shared | Stop current playback. |
| Increase Reading Speed | Shared | Increase speed for the default provider. |
| Decrease Reading Speed | Shared | Decrease speed for the default provider. |
| MiniMax Reading Status | MiniMax | Menu-bar controls for MiniMax reading sessions. |
| MiMo Reading Status | MiMo | Menu-bar controls for MiMo playback and speed. |

## Preferences

### Shared

- **Default TTS Provider**: `MiniMax` or `MiMo`. This controls the shared Quick Read and speed commands.

### MiniMax

- **MiniMax Authentication Mode**
- **MiniMax Token Plan Key**
- **MiniMax Open Platform API Key**
- **MiniMax Region**
- **MiniMax Model**
- **MiniMax Default Voice**
- **MiniMax Default Custom Voice ID**
- **MiniMax Extra Custom Voice IDs**
- **MiniMax Language Boost**
- **MiniMax Speech Rate**

### MiMo

- **MiMo Token Plan API Key**
- **MiMo Token Plan Base URL**
- **MiMo TTS Model**
- **MiMo Default Voice**
- **MiMo Speech Rate**
- **MiMo Speaking Style**

MiMo preferences intentionally use the `mimo*` prefix internally so they do not collide with the older MiniMax preference names. A future Doubao provider should follow the same pattern with `doubao*` names.

## Setup

```bash
npm install
npm run dev
```

For local verification:

```bash
npm run build
npm run lint
npx tsc --noEmit
```

## Implementation Notes

- MiniMax API: `POST /v1/t2a_v2`; audio is returned as hex MP3 and converted to base64 before playback.
- MiniMax voice lookup: `POST /v1/get_voice`.
- MiniMax voice clone: file upload plus `POST /v1/voice_clone`.
- MiMo API: `POST {MiMo Token Plan Base URL}/chat/completions`.
- MiMo audio is returned as base64 WAV.
- Playback uses macOS `afplay`.
- The shared audio player now supports MP3/WAV temp files, optional playback rate, and abort signals for MiMo lookahead synthesis.
- Provider-specific local storage keys are kept separate for voice overrides, live playback state, and speed overrides.

## Provider Extension Pattern

When adding Doubao, keep it provider-scoped:

- `src/api/doubao-tts.ts`
- `src/api/doubao-types.ts`
- `src/constants/doubao-voices.ts`
- `src/utils/doubao-*`
- `doubao*` preference names
- direct provider commands first, then wire shared Quick Read after the provider is stable
