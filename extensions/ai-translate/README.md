# AI Translate for Raycast

一个面向整句翻译的 Raycast 扩展，参考 Easydict 的交互骨架，但核心目标从“查词”改为“选中文本 / 截图 OCR 后调用大模型翻译”。

## 功能

- 选中翻译：选中任意应用里的文本后运行 `Translate Selected Text`。
- 截图翻译：运行 `Translate Screenshot`，框选屏幕区域，OCR 识别后自动打开翻译结果。
- 交互式 OCR：运行 `Extract Text from Screenshot`，框选屏幕区域，OCR 识别后可编辑、复制、压缩复制或继续翻译。
- 快速复制 OCR：运行 `Copy Text from Screenshot`，框选屏幕区域，OCR 识别后直接复制到剪贴板。
- OCR 引擎：支持本地 macOS Vision、Tesseract、百度 OCR API、本地/自托管 PaddleOCR。
- 多模型：支持 DeepSeek、小米 MiMo、MiniMax、Gemini、Kimi、OpenAI / ChatGPT。
- 可配置：Provider 开关、排序、目标语言、翻译风格、模型名、Base URL、API Key。

## AI Provider Defaults

| Provider    | Anthropic Base URL                               | Default Model       |
| ----------- | ------------------------------------------------ | ------------------- |
| DeepSeek    | `https://api.deepseek.com/anthropic`             | `deepseek-v4-flash` |
| Xiaomi MiMo | `https://token-plan-cn.xiaomimimo.com/anthropic` | `mimo-v2-flash`     |
| MiniMax     | `https://api.minimaxi.com/anthropic`             | `MiniMax-M2.7`      |
| Kimi        | `https://api.moonshot.ai/anthropic`              | `kimi-k2.6`         |

DeepSeek, MiMo, MiniMax, and Kimi use one Anthropic-compatible entrypoint each. The extension appends `/v1/messages` automatically. OpenAI and Gemini keep their native protocols. Model preferences remain text fields so newer model IDs can be entered without changing the extension.

Current model IDs worth trying:

- Xiaomi MiMo: `mimo-v2.5`, `mimo-v2.5-pro`, `mimo-v2-pro`, `mimo-v2-omni`
- MiniMax: `MiniMax-M2.7-highspeed`
- Kimi: `kimi-k2.5`, `moonshot-v1-8k`, `moonshot-v1-32k`, `moonshot-v1-128k`

## 官方接口文档

| Provider         | 接入方式                                   | 官方文档                                                                                                                                                                                               |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DeepSeek         | Anthropic-compatible Messages              | [Anthropic API](https://api-docs.deepseek.com/guides/anthropic_api)                                                                                                                                    |
| Xiaomi MiMo      | Token Plan / Anthropic-compatible Messages | [Anthropic API Compatibility](https://platform.xiaomimimo.com/static/docs/api/chat/anthropic-api.md), [Token Plan Quick Access](https://platform.xiaomimimo.com/static/docs/tokenplan/quick-access.md) |
| MiniMax          | Token Plan / Anthropic-compatible Messages | [Anthropic API 兼容](https://platform.minimaxi.com/docs/api-reference/text-anthropic-api), [Token Plan 快速接入](https://platform.minimaxi.com/docs/token-plan/quickstart)                             |
| Gemini           | Gemini `generateContent`                   | [Text generation](https://ai.google.dev/gemini-api/docs/text-generation), [Gemini API reference](https://ai.google.dev/gemini-api/docs/api-overview)                                                   |
| Kimi             | Anthropic-compatible agent integration     | [ClaudeCode / Cline / RooCode 接入说明](https://platform.kimi.ai/docs/guide/agent-support), [API Overview](https://platform.kimi.ai/docs/api/overview)                                                 |
| OpenAI / ChatGPT | Chat Completions                           | [Chat Completions API Reference](https://platform.openai.com/docs/api-reference/chat/create)                                                                                                           |

| OCR Engine     | 官方文档                                                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baidu OCR API  | [通用文字识别（标准版）](https://cloud.baidu.com/doc/OCR/s/zk3h7xz52), [通用文字识别（高精度版）](https://cloud.baidu.com/doc/OCR/s/1k3h7y3db), [鉴权认证机制](https://cloud.baidu.com/doc/AI_REFERENCE/s/um3zhy50e) |
| PaddleOCR HTTP | [Server Deployment](https://paddlepaddle.github.io/PaddleOCR/main/en/version3.x/deployment/serving.html), [OCR Pipeline Usage](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html)                  |

## 快捷键

Raycast 扩展不能在代码里强制写入全局快捷键。安装后在 Raycast Settings > Extensions > AI Translate 里给 `Translate Screenshot`、`Extract Text from Screenshot` 或 `Copy Text from Screenshot` 绑定你想要的快捷键即可。

## 开发

```bash
npm install
npm run dev
```

`npm run dev` 会先生成图标并编译 Swift OCR 二进制。首次截图 OCR 可能需要 macOS 授予 Raycast 屏幕录制权限。

## OCR API 选择

- `Local macOS Vision`：默认方案，最快、无网络、隐私最好。
- `Tesseract Local`：参考 omarchy-cmd-ocr 的轻量本地 pipeline；可用 `brew install tesseract` 安装，并通过 `Tesseract Languages` 配置 `eng+chi_sim` 等语言包。
- `Baidu OCR API`：同步接口，适合截图翻译；`general_basic` 更快，`accurate_basic` 更稳。
- `PaddleOCR HTTP`：适合你自托管 PaddleOCR service，默认 endpoint 是 `http://localhost:8080/ocr`。

API OCR 失败时默认会用同一张截图回退到本地 Vision OCR。

`OCR Text Layout` 借鉴了 omarchy-cmd-ocr 的双模式：`Formatted` 保留换行，`Compact` 会把识别结果压成单行，更适合对零散 UI 文本做整句翻译。
