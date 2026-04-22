# MiMo TTS — Raycast 扩展

在 macOS 上选中任意文字，通过 Raycast 调用小米 MiMo TTS 朗读。

## 功能

- **Quick Read**：选中文字后一键朗读，再次触发可停止当前播放。
- **音色浏览**：用 Raycast detail panel 展示 MiMo-V2.5 内置中英文音色。
- **结构化控制**：组合语速、整体风格标签、节奏事件、情绪状态、语音特征和导演模式提示。
- **试听与默认音色**：可试听音色，并设为 Quick Read 默认音色。
- **风格提示词**：可用自然语言控制语气、情绪、节奏和朗读风格。
- **长文本播放**：自动切分长选区，顺序合成并播放。

## 配置

1. 订阅小米 MiMo Token Plan，并打开 [Subscription](https://platform.xiaomimimo.com/#/console/plan-manage) 页面。
2. 打开 Raycast 中 **MiMo TTS** 的扩展设置。
3. 在 **Token Plan API Key** 中填写 `tp-...` 开头的套餐专属 Key。
4. **Token Plan Base URL** 默认是 `https://token-plan-cn.xiaomimimo.com/v1`；如果订阅页显示新加坡或欧洲集群，就改成对应 URL。
5. 默认使用 **MiMo-V2.5-TTS**；只有需要旧版音色时再切换到 **MiMo-V2-TTS**。
6. 可按需设置默认音色、语速提示和朗读风格。

## 命令

| 命令 | 用途 |
| --- | --- |
| Quick Read Selected Text | 用默认音色朗读当前选区；再次触发停止播放。 |
| Read with Voice | 浏览音色并选择一个音色朗读当前选区。 |
| Read with Controls | 用表单调节语速、风格标签、音频事件、复合情绪、语音质感和导演模式指令。 |
| Select Quick Read Voice | 试听并保存 Quick Read 使用的音色。 |
| Stop Reading | 停止当前播放。 |

## 实现说明

- 接口：`POST {Token Plan Base URL}/chat/completions`。
- 插件使用小米 MiMo Token Plan 凭据：`tp-...` API Key 加 Token Plan OpenAI-compatible Base URL。
- 待合成文本按官方要求放入 `assistant` message。
- 风格提示词放入可选的 `user` message。
- **Read with Controls** 会把整体风格标签写成 `(标签1 标签2)`，把音频事件写成 `（标签1，标签2）`，并放到每个合成片段开头。
- 自然语言预设和导演模式会放入 `user` message；选中的音频标签会放入 `assistant` 文本。
- 如果选择 `唱歌`，插件会强制只使用 `(唱歌)` 作为开头标签，确保它位于文本最开头。
- 插件请求 WAV 音频，播放返回的 base64 音频数据。
- 停止播放使用共享 PID 文件：`$TMPDIR/mimo-tts.pid`。

## 参考

- [Speech synthesis (MiMo-V2.5-TTS Series)](https://platform.xiaomimimo.com/static/docs/usage-guide/speech-synthesis-v2.5.md)
- [Token Plan Quick Access](https://platform.xiaomimimo.com/static/docs/tokenplan/quick-access.md)
