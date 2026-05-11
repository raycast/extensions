# Doubao TTS — Raycast 扩展

<p align="center">
  <img src="assets/command-icon.png" width="128" height="128" alt="Doubao TTS 图标" />
</p>

<p align="center">
  在 macOS 上选中任意文字，通过 <a href="https://www.raycast.com/">Raycast</a> 一键朗读，基于<a href="https://www.volcengine.com/docs/6561/1329505">火山引擎豆包语音合成大模型 V3 WebSocket 流式接口</a>。
</p>

---

## 功能特性

- **一键朗读**：选中文字后快速朗读，无需打开视图。
- **音色选择**：浏览 160+ 个中英文音色，包含官方豆包语音合成模型 2.0 音色列表。
- **Quick Read 音色选择**：选择并试听 Quick Read 默认音色。
- **停止播放**：随时停止播放，也可以再次触发 Quick Read 来停止。
- **智能分片**：按句子和标点拆分长文本。
- **流水线播放**：当前分片播放时，后台预合成下一分片。
- **模型切换**：支持豆包 TTS 2.0、TTS 1.0 和声音复刻资源 ID。
- **灵活鉴权**：优先使用当前火山引擎 `X-Api-Key` 鉴权方式，并保留旧版 App ID / Access Key 兼容。

## 截图

![Doubao TTS 截图](metadata/doubao-tts-1.png)

## 配置

首次使用前，请打开扩展偏好设置。新用户建议填写当前控制台中的 **API Key**；已有用户也可以继续使用旧版 **App ID** 和 **Access Key**。

| 配置项 | 说明 | 必填 |
| --- | --- | :---: |
| API Key | 豆包语音 API Key，新用户推荐使用。 | 可选 |
| App ID | 旧版豆包 TTS App ID，仅在 API Key 为空时使用。 | 可选 |
| Access Key | 旧版豆包 TTS Access Key，仅在 API Key 为空时使用。 | 可选 |
| Model Version | 语音合成模型，默认 TTS 2.0。 | 可选 |
| Default Voice | Quick Read 默认音色。 | 可选 |
| Speech Rate | 语速，0.5x 到 2.0x。 | 可选 |

## 使用方法

### Quick Read

1. 在任意 macOS 应用中选中文字。
2. 打开 Raycast，运行 **Quick Read Selected Text**。
3. 再次触发该命令即可停止播放。

### 选择 Quick Read 默认音色

1. 运行 **Select Quick Read Voice**。
2. 搜索或浏览当前模型支持的音色。
3. 按回车设为 Quick Read 音色。
4. 使用 **Preview Voice** 可以用当前选区或剪贴板文本试听。

### 指定音色朗读

1. 选中文字。
2. 运行 **Read with Voice Selection**。
3. 选择音色并按回车朗读。

## 技术细节

- **API**：火山引擎豆包 TTS V3 WebSocket 双向流式接口
- **鉴权**：`X-Api-Key` 或旧版 `X-Api-App-Id` + `X-Api-Access-Key`，并附带 `X-Api-Resource-Id` 和每次连接唯一的 `X-Api-Connect-Id`
- **响应**：V3 WebSocket 二进制帧，音频 payload 为流式 MP3 数据
- **音频**：MP3，24000 Hz
- **分片**：按标点智能拆分，每片不超过 4096 UTF-8 字节
- **播放**：macOS 内置 `afplay`
- **停止控制**：共享 PID 文件 `$TMPDIR/doubao-tts.pid`

## 相关文档

- [Raycast 扩展文档](https://developers.raycast.com/)
- [豆包语音合成大模型 V3 WebSocket 双向流式](https://www.volcengine.com/docs/6561/1329505)
- [豆包大模型音色列表](https://www.volcengine.com/docs/6561/1257544)
- [火山引擎控制台 FAQ](https://www.volcengine.com/docs/6561/196768)

## 许可证

[MIT](LICENSE)
