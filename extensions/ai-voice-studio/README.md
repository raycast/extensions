# AI Voice Studio

AI Voice Studio is a Raycast extension for reading selected text, clipboard text, or typed text with multiple AI speech providers.

The current provider set is intentionally small:

- **Qwen-TTS** through Alibaba Cloud Model Studio / DashScope, with region-aware endpoints, official language selection, instruct-model guidance, and the current system voice catalog.
- **MiMo** through Xiaomi MiMo Token Plan.
- **OpenAI** through the OpenAI Speech API.

The extension focuses on everyday reading and quick voice testing rather than full audio production. It provides shared quick-read commands, provider-specific voice pickers, focused setup for defaults, playback speed controls, status menu-bar items, and local verification scripts for provider routing and playback behavior.

## Commands

| Command                       | Provider         | Purpose                                                                                               |
| ----------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| Quick Read                    | Default provider | Reads selected text, or clipboard text if no selection is available. Running it again stops playback. |
| Setup Voice Defaults          | All              | Chooses the default provider and provider-specific model, voice, speed, and advanced defaults.        |
| Test Voice Setup              | Default provider | Synthesizes and plays a short sample to check credentials, latency, and playback.                     |
| Quick Read with Qwen-TTS      | Qwen-TTS         | Reads selected or clipboard text with the configured Qwen-TTS voice.                                  |
| Read with Qwen-TTS Voice      | Qwen-TTS         | Browses Qwen-TTS voices before reading.                                                               |
| Set Qwen-TTS Quick Read Voice | Qwen-TTS         | Sets the Qwen-TTS voice used by Quick Read.                                                           |
| Qwen-TTS Reading Status       | Qwen-TTS         | Shows Qwen-TTS playback status and controls in the menu bar.                                          |
| TTS Studio                    | MiMo             | Generates MiMo speech from typed, selected, or pasted text.                                           |
| Quick Read with MiMo          | MiMo             | Reads selected or clipboard text with the configured MiMo voice.                                      |
| Read with MiMo Voice          | MiMo             | Browses MiMo voices before reading.                                                                   |
| Set MiMo Quick Read Voice     | MiMo             | Sets the MiMo voice used by Quick Read.                                                               |
| MiMo Reading Status           | MiMo             | Shows MiMo playback status and controls in the menu bar.                                              |
| OpenAI TTS Studio             | OpenAI           | Generates OpenAI speech with voice, tone, delivery, and style controls.                               |
| Quick Read with OpenAI        | OpenAI           | Reads selected or clipboard text with the configured OpenAI voice.                                    |
| Read with OpenAI Voice        | OpenAI           | Browses OpenAI voices before reading.                                                                 |
| Set OpenAI Quick Read Voice   | OpenAI           | Sets the OpenAI voice used by Quick Read.                                                             |
| OpenAI Reading Status         | OpenAI           | Shows OpenAI playback status and controls in the menu bar.                                            |
| Stop Reading                  | All              | Stops current playback across providers.                                                              |
| Increase Reading Speed        | Default provider | Raises playback speed by one step.                                                                    |
| Decrease Reading Speed        | Default provider | Lowers playback speed by one step.                                                                    |

## Credentials

Configure credentials in Raycast extension preferences:

- DashScope API Key for Qwen-TTS.
- MiMo Token Plan API Key.
- OpenAI API Key.

Provider defaults live in `Setup Voice Defaults` instead of command-level preferences, so the Raycast sidebar stays focused on credentials only.

## Qwen-TTS

The Qwen-TTS integration uses Alibaba Cloud's non-realtime HTTP generation endpoint. It downloads the returned 24-hour audio URL when DashScope returns a URL instead of inline audio data, then plays chunks through the shared lookahead playback engine.

Qwen defaults to `qwen3-tts-flash` for low-latency everyday reading. `qwen3-tts-instruct-flash` is available when narration instructions are needed, including the optional DashScope `optimize_instructions` flag. Region presets cover Beijing and Singapore endpoints, while Custom Endpoint remains available for advanced DashScope-compatible routing.

## Development

```bash
npm install
npm run verify
```

Useful targeted checks:

```bash
npm run verify:runtime
npm run verify:provider-settings
npm run verify:provider-contracts
npm run verify:pipeline-lookahead
npm run verify:audio-player
```

`npm run verify` runs the runtime checks, provider setting checks, provider contract mocks, live-smoke guardrails, pipeline lookahead checks, audio-player regressions, build, lint, TypeScript, audit, and local verification evidence write.

## 中文说明

AI Voice Studio 是一个 Raycast 语音朗读扩展，用于把选中文本、剪贴板文本或手动输入文本交给 AI TTS provider 朗读。

当前只保留三条 provider 路线：

- **Qwen-TTS**：通过 Alibaba Cloud Model Studio / DashScope，支持 region-aware endpoint、官方语种选择、Instruct 模型指令控制和当前系统音色目录。
- **MiMo**：通过 Xiaomi MiMo Token Plan。
- **OpenAI**：通过 OpenAI Speech API。

这个扩展的目标不是做完整音频工作站，而是把日常朗读、声音选择、默认设置、速度控制和快速自检做稳。各 provider 的设置集中在 `Setup Voice Defaults`，Raycast 扩展偏好里只保留 API key。

开发与验证：

```bash
npm install
npm run verify
```
