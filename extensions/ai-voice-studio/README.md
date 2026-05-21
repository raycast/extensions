# AI Voice Studio

Languages: [English](#ai-voice-studio) | [中文](#中文说明)

AI Voice Studio is a small Raycast extension for turning text into speech without leaving your keyboard.

It began as a MiniMax reading helper and has grown into a modest multi-provider voice workspace. The goal is not to be a full audio production suite. It is meant to do a few everyday things well: read selected text, keep long readings resumable, test voice settings quickly, and make it easy to try different AI speech providers from the same Raycast surface.

## Why This Exists

Reading on screen is not always the nicest way to work through text. Sometimes you want to listen to a draft, a long article, a paragraph from a browser tab, or a bit of reference material while your eyes get a break.

AI Voice Studio tries to make that flow simple:

- Select text or copy it to the clipboard.
- Run a Raycast command.
- Hear the result with your chosen provider and voice.
- Stop, resume, restart, or adjust speed when the text is longer than expected.

The extension is deliberately practical. Provider details stay configurable, but common reading actions stay close at hand.

## Providers

### MiniMax

MiniMax is the most complete reading path in this extension. It is best suited for longer text and repeated reading workflows.

- Quick Read from selected text or clipboard.
- Resume and restart the last reading session.
- Menu-bar reading status for current progress.
- Speed controls that can carry across paused sessions.
- Lookahead synthesis for smoother chunk-to-chunk playback.
- Voice picker for built-in, cloned, generated, and custom voice IDs.
- Voice cloning with upload cache and preview playback.
- Token Plan and Open Platform API key modes.
- China and Global endpoint support.

### MiMo

MiMo is the expressive voice path. It is useful when you want more control over delivery, emotion, rhythm, and speaking style.

- Quick Read with MiMo.
- TTS Studio for typed, selected, pasted, or clipboard text.
- Voice picker and quick-read voice selection.
- Natural-language director prompt.
- Style, rhythm, emotion, vocal texture, and expression tags.
- Lookahead playback with stop-request safeguards.
- Menu-bar status and speed controls.

### OpenAI

OpenAI support is intentionally lightweight: a clear Speech API reading path with a familiar voice list.

- Quick Read with OpenAI.
- Voice picker and quick-read voice selection.
- `gpt-4o-mini-tts` only — OpenAI's latest speech model. Legacy `tts-1` / `tts-1-hd` have been removed.
- Built-in voices such as `cedar`, `marin`, `coral`, `alloy`, `nova`, and `shimmer`.
- Steerable narration: Tone / Expressiveness / Delivery / Accent focus pickers (defaults tuned for English / German / Chinese academic reading), plus free-text extra notes.
- WAV response format by default for lowest playback latency; MP3 also available.
- Lookahead playback with stop-request safeguards.

## Commands

| Command | Provider | What It Does |
| --- | --- | --- |
| Quick Read | Default provider | Reads selected text or clipboard text. Run again to stop. |
| Setup Voice Defaults | Shared | Configures the default provider and one provider's voice/model/speed settings at a time. |
| Test Voice Setup | Shared | Generates and plays a short sample so you can confirm the current setup works. |
| Stop Reading | Shared | Stops current playback. |
| Increase Reading Speed | Shared | Speeds up the next segment or playback. |
| Decrease Reading Speed | Shared | Slows down the next segment or playback. |
| Resume Last Reading | MiniMax | Continues the previous MiniMax reading session. |
| Restart Last Reading | MiniMax | Starts the previous MiniMax reading session again. |
| Read with MiniMax Voice | MiniMax | Lets you pick a MiniMax voice before reading. |
| Set MiniMax Quick Read Voice | MiniMax | Sets the MiniMax voice used by Quick Read. |
| Clone MiniMax Voice | MiniMax | Uploads audio and creates a cloned MiniMax voice. |
| MiniMax Reading Status | MiniMax | Shows menu-bar reading controls and progress. |
| TTS Studio | MiMo | Opens MiMo's expressive speech controls. |
| Quick Read with MiMo | MiMo | Reads directly with MiMo, regardless of the default provider. |
| Read with MiMo Voice | MiMo | Lets you pick a MiMo voice before reading. |
| Set MiMo Quick Read Voice | MiMo | Sets the MiMo voice used by Quick Read. |
| MiMo Reading Status | MiMo | Shows menu-bar MiMo playback and speed controls. |
| Quick Read with OpenAI | OpenAI | Reads directly with OpenAI, regardless of the default provider. |
| Read with OpenAI Voice | OpenAI | Lets you pick an OpenAI voice before reading. |
| Set OpenAI Quick Read Voice | OpenAI | Sets the OpenAI voice used by Quick Read. |

## Setup

Install dependencies and start Raycast development mode:

```bash
npm install
npm run dev
```

Add API keys in Raycast Preferences:

- MiniMax Token Plan Key
- MiniMax Open Platform API Key
- MiMo Token Plan API Key
- OpenAI API Key

Then run **Setup Voice Defaults** to choose the default provider and configure provider-specific model, voice, speed, format, style, region, and endpoint options. API keys stay in Raycast Preferences; everyday voice settings live in the setup command so the Preferences sidebar stays manageable.

Run **Test Voice Setup** after adding or changing a key. It calls the selected provider, plays a short sample, and reports enough feedback to tell whether the provider path is working.

## Development

Common local checks:

```bash
npm run verify
```

Useful focused checks:

```bash
npm run verify:runtime
npm run verify:provider-settings
npm run verify:provider-contracts
npm run verify:pipeline-lookahead
npm run verify:audio-player
npm run build
npm run lint
npx tsc --noEmit
npm audit
```

For a local macOS playback smoke test that uses real `afplay`:

```bash
npm run verify:local-playback
```

Live provider smoke tests are opt-in because they call real TTS APIs:

```bash
npm run verify:live-env
AI_VOICE_STUDIO_LIVE=1 AI_VOICE_STUDIO_PROVIDERS=openai OPENAI_API_KEY=... npm run verify:live-smoke
npm run verify:goal
```

`verify:live-env` reports only whether provider keys are present. It does not print key values or call provider APIs.

## Design Notes

- Provider settings are intentionally scoped by provider, so MiniMax, MiMo, OpenAI, and future providers do not share voice or playback state by accident.
- MiniMax long-form reading stores resumable sessions and keeps speed changes visible to the next segment.
- MiMo and OpenAI reading paths use lookahead synthesis while preserving stop behavior, so prepared audio does not keep playing after a stop request.
- The shared audio player uses macOS `afplay` and cleans up temporary audio after playback.
- Command icons are deliberately unified under the AI Voice Studio icon so provider-specific commands still feel like one extension.

## Adding Another Provider

The extension is organized so another provider can be added without mixing settings into existing providers. A new provider should follow the same shape:

- `src/api/<provider>-tts.ts`
- `src/api/<provider>-types.ts`
- `src/constants/<provider>-voices.ts`
- `src/utils/<provider>-*`
- provider-scoped LocalStorage and preference names
- direct provider commands first, then shared Quick Read integration once the provider is stable

## A Small Caveat

AI speech APIs change, voices move, and latency varies by region and provider. This project tries to make those edges visible rather than pretend they do not exist. If a provider path fails, the extension should point you toward the missing key, setting, or provider response instead of failing silently.

## 中文说明

AI Voice Studio 是一个小型 Raycast 扩展，用来把文本快速转换成语音，并尽量不打断你正在做的事。

它最早只是一个 MiniMax 阅读助手，后来慢慢长成了一个多 provider 的语音工作台。它不想伪装成完整的音频制作软件，也不追求把所有语音功能都塞进来。它更关心几个日常场景：朗读选中文本、让长文本可以继续读、快速测试当前声音配置，以及在同一个 Raycast 界面里切换和比较不同 AI 语音服务。

## 为什么做它

很多时候，文字不一定非要一直盯着屏幕读。你可能只是想听一段草稿、一篇长文章、浏览器里选中的一段材料，或者一小段参考文本，让眼睛休息一下。

AI Voice Studio 想把这个流程压得很短：

- 选中文本，或者把文本复制到剪贴板。
- 运行一个 Raycast 命令。
- 用你选好的 provider 和声音听到朗读。
- 如果文本比预期长，可以停止、继续、重新开始，或者调整速度。

这个扩展的取向是实用而克制：provider 的细节可以配置，但常用的朗读动作应该足够顺手。

## 支持的 Provider

### MiniMax

MiniMax 是目前最完整的阅读路径，更适合长文本和反复使用的朗读流程。

- 从选中文本或剪贴板 Quick Read。
- 继续或重新开始上一次阅读。
- 通过菜单栏查看当前阅读进度。
- 支持速度调整，并尽量保留到暂停后的后续阅读。
- 预先合成下一段，减少分段播放之间的停顿。
- 可选择内置声音、克隆声音、生成声音和自定义 voice ID。
- 支持声音克隆、上传缓存和试听。
- 支持 Token Plan 和 Open Platform 两类 key。
- 支持中国区和 Global endpoint。

### MiMo

MiMo 是更偏表达控制的语音路径，适合需要调节语气、节奏、情绪和说话风格的场景。

- 使用 MiMo Quick Read。
- 在 TTS Studio 中处理输入文本、选中文本、粘贴文本或剪贴板文本。
- 选择声音，并设置 Quick Read 默认声音。
- 使用自然语言 director prompt 控制表达方式。
- 支持 style、rhythm、emotion、vocal texture 和 expression 等标签。
- 支持预合成播放，并在停止时避免继续播放已准备好的音频。
- 提供菜单栏状态和速度控制。

### OpenAI

OpenAI 路径保持得比较轻量：它提供一条清晰的 Speech API 朗读流程，以及一组熟悉的声音选项。

- 使用 OpenAI Quick Read。
- 选择声音，并设置 Quick Read 默认声音。
- 仅使用 `gpt-4o-mini-tts`（OpenAI 最新语音模型），已移除旧版 `tts-1` / `tts-1-hd`。
- 支持 `cedar`、`marin`、`coral`、`alloy`、`nova`、`shimmer` 等内置声音。
- 朗读风格可调：Tone / Expressiveness / Delivery / Accent focus 四个选择器（默认按英语 / 德语 / 中文学术朗读调优），另加自由文本补充说明。
- 默认 WAV 输出格式（起播延迟最低），同时支持 MP3。
- 支持预合成播放，并在停止时避免继续播放已准备好的音频。

## 命令

| Command | Provider | 作用 |
| --- | --- | --- |
| Quick Read | 默认 provider | 朗读选中文本或剪贴板文本。再次运行可停止。 |
| Setup Voice Defaults | 通用 | 设置默认 provider，并逐个配置 provider 的声音、模型和速度等选项。 |
| Test Voice Setup | 通用 | 生成并播放一段短样例，用来确认当前配置是否可用。 |
| Stop Reading | 通用 | 停止当前播放。 |
| Increase Reading Speed | 通用 | 提高下一段或下一次播放的速度。 |
| Decrease Reading Speed | 通用 | 降低下一段或下一次播放的速度。 |
| Resume Last Reading | MiniMax | 继续上一次 MiniMax 阅读。 |
| Restart Last Reading | MiniMax | 从头重新开始上一次 MiniMax 阅读。 |
| Read with MiniMax Voice | MiniMax | 先选择 MiniMax 声音，再开始朗读。 |
| Set MiniMax Quick Read Voice | MiniMax | 设置 MiniMax Quick Read 使用的默认声音。 |
| Clone MiniMax Voice | MiniMax | 上传音频并创建 MiniMax 克隆声音。 |
| MiniMax Reading Status | MiniMax | 在菜单栏显示 MiniMax 阅读进度和控制项。 |
| TTS Studio | MiMo | 打开 MiMo 的表达控制界面。 |
| Quick Read with MiMo | MiMo | 直接使用 MiMo 朗读，不受默认 provider 影响。 |
| Read with MiMo Voice | MiMo | 先选择 MiMo 声音，再开始朗读。 |
| Set MiMo Quick Read Voice | MiMo | 设置 MiMo Quick Read 使用的默认声音。 |
| MiMo Reading Status | MiMo | 在菜单栏显示 MiMo 播放状态和速度控制。 |
| Quick Read with OpenAI | OpenAI | 直接使用 OpenAI 朗读，不受默认 provider 影响。 |
| Read with OpenAI Voice | OpenAI | 先选择 OpenAI 声音，再开始朗读。 |
| Set OpenAI Quick Read Voice | OpenAI | 设置 OpenAI Quick Read 使用的默认声音。 |

## 设置

安装依赖并启动 Raycast 开发模式：

```bash
npm install
npm run dev
```

在 Raycast Preferences 里添加 API key：

- MiniMax Token Plan Key
- MiniMax Open Platform API Key
- MiMo Token Plan API Key
- OpenAI API Key

然后运行 **Setup Voice Defaults**，选择默认 provider，并配置各 provider 的模型、声音、速度、格式、风格、区域和 endpoint 等选项。API key 保留在 Raycast Preferences 里，常用声音设置放在单独命令中，这样 Preferences 侧栏不会被挤得太满。

添加或修改 key 之后，可以运行 **Test Voice Setup**。它会调用当前选中的 provider，播放一段短样例，并给出足够的反馈，帮助你判断配置是否真的可用。

## 开发

常用本地检查：

```bash
npm run verify
```

也可以按需要运行更小的检查：

```bash
npm run verify:runtime
npm run verify:provider-settings
npm run verify:provider-contracts
npm run verify:pipeline-lookahead
npm run verify:audio-player
npm run build
npm run lint
npx tsc --noEmit
npm audit
```

如果要测试 macOS 本机 `afplay` 播放路径：

```bash
npm run verify:local-playback
```

真实 provider smoke test 默认不运行，因为它会调用实际 TTS API：

```bash
npm run verify:live-env
AI_VOICE_STUDIO_LIVE=1 AI_VOICE_STUDIO_PROVIDERS=openai OPENAI_API_KEY=... npm run verify:live-smoke
npm run verify:goal
```

`verify:live-env` 只报告 provider key 是否存在，不会打印 key 的具体值，也不会调用 provider API。

## 设计说明

- 各 provider 的设置相互隔离，避免 MiniMax、MiMo、OpenAI 或未来 provider 意外共用声音和播放状态。
- MiniMax 长文本阅读会保存可继续的 session，并让速度调整尽量延续到下一段。
- MiMo 和 OpenAI 会预先合成下一段，但仍然尊重停止请求，避免已经准备好的音频在停止后继续播放。
- 共享播放器使用 macOS `afplay`，并在播放后清理临时音频文件。
- 所有命令统一使用 AI Voice Studio 图标，让不同 provider 的命令仍然属于同一个扩展。

## 新增 Provider

扩展结构刻意按 provider 拆分，方便以后增加新的语音服务，而不把设置混进已有 provider。新的 provider 建议沿用这一形状：

- `src/api/<provider>-tts.ts`
- `src/api/<provider>-types.ts`
- `src/constants/<provider>-voices.ts`
- `src/utils/<provider>-*`
- 使用 provider-scoped 的 LocalStorage 和 preference 名称
- 先做 provider 直达命令，等稳定后再接入共享 Quick Read

## 一个小提醒

AI 语音 API 会变化，声音列表会调整，延迟也会受地区和 provider 状态影响。这个项目不会假装这些边界不存在；它更希望在出错时把问题暴露清楚，比如缺少 key、设置不匹配，或 provider 返回了具体错误，而不是悄悄失败。
