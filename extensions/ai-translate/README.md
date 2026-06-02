# AI Translate for Raycast

AI Translate is a small Raycast extension for everyday translation and screenshot OCR.

It is built for a modest but common problem: sometimes you want to translate a sentence or read text from an image without opening a large translation app. AI Translate keeps those steps inside Raycast and lets you bring your own API keys for the model providers you already use.

It does not try to replace professional translation, legal review, or careful human editing. For important writing, citations, contracts, academic text, or public-facing copy, please treat the output as a draft and review it yourself.

## What It Does

- **Translate selected text**: select text in any app, run `Translate Text`, and compare results from enabled providers.
- **Translate and paste in place**: use `Translate & Paste` when you want a no-window workflow for a global hotkey.
- **Capture text and translate**: capture a screen region, extract text with OCR, review the result, and translate it.
- **Standalone OCR**: use `Capture Text` to capture, edit, copy, strip line breaks, auto-paragraph, or send the text to translation.
- **History**: browse recent translations you copied or pasted. Older rewrite entries from previous versions remain visible locally.
- **Settings**: set the default provider/model used by translation and capture prompts, then tune prompt profile, translation style, OCR, voice provider/model, and custom instructions without digging through every provider setting.

## Main Commands

| Command                    | Mode    | English                                                                                    | 中文                                                                       |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `Translate Text`           | View    | Translate selected or typed text, with provider comparison and read-aloud actions.         | 翻译选中文本或手动输入文本，可比较多个 provider，并支持朗读。              |
| `Translate & Paste`        | No-view | Translate selected text with the active default provider/model and paste it back.          | 用当前默认 provider/model 翻译选中文本，并直接粘回原处。                   |
| `Capture Text & Translate` | View    | Capture a region, OCR it, review the text, and translate it.                               | 截图取字、检查 OCR 结果，再进行翻译。                                      |
| `Capture Text & Copy`      | No-view | Capture a region, OCR it, and copy the text to the clipboard.                              | 截图取字并直接复制到剪贴板。                                               |
| `Capture Text`             | View    | Extract text from a screenshot and clean or copy the result.                               | 从截图中提取文字，并做换行整理、自动分段或复制。                           |
| `History`                  | View    | Revisit recent translation results. Older rewrite entries remain visible.                  | 查看最近复制或粘贴过的翻译记录；旧版本的改写记录仍可回看。                 |
| `Settings`                 | View    | Configure durable defaults for provider/model, prompt profile, style, OCR, voice, and instructions. | 配置稳定默认值：provider/model、提示词场景、翻译风格、OCR、朗读声音和自定义说明。 |

## Division with Say It Right

Use **AI Translate** when the task is translation, screenshot OCR, captured UI text, or copy-ready bilingual reading. Use **Say It Right** when the task is English expression and speech practice: turning Chinese intent or rough English into natural English, explaining why the phrasing works, analyzing stress and intonation, playing a model voice, slowing it down, and shadowing it.

In practice: AI Translate answers "what does this text mean in another language?" Say It Right answers "how should I say this naturally in English, why does that wording work, and how do I pronounce it?"

## Providers

AI Translate is a bring-your-own-key extension. You decide which providers to enable and in what order. The default model catalog tracks each provider's current documentation:

| Provider         | Default Fast        | Default Best             | Endpoint                                                                                                                                                                                                 |
| ---------------- | ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek         | `deepseek-v4-flash` | `deepseek-v4-pro`        | Anthropic-compatible `https://api.deepseek.com/anthropic`                                                                                                                                                |
| MiniMax          | `MiniMax-M3`        | `MiniMax-M3`             | Anthropic-compatible `https://api.minimaxi.com/anthropic`                                                                                                                                                |
| Xiaomi MiMo      | `mimo-v2.5`         | `mimo-v2.5-pro`          | Anthropic-compatible `https://token-plan-cn.xiaomimimo.com/anthropic` (Token Plan)                                                                                                                       |
| Gemini           | `gemini-3.5-flash`  | `gemini-3.1-pro-preview` | Google `https://generativelanguage.googleapis.com/v1beta`                                                                                                                                                |
| OpenAI / ChatGPT | `gpt-4.1-mini`      | `gpt-4.1`                | OpenAI Chat Completions `https://api.openai.com/v1`; GPT-5.x reasoning models (`gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`) are sent with `reasoning_effort: "minimal"` for translation latency |

Provider credentials and durable defaults live in Raycast preferences and the **Settings** command: default provider, default model tier, API key, base URL, custom model name, timeout, and provider order. Day-to-day choices live in the extension UI: switch between **All Enabled Providers** and a **Single Provider**, choose **Fast**, **Best**, or **Custom** model defaults, or pick a specific provider model from the action panel. `Custom` uses the model IDs you enter in preferences, which is useful when providers add new models before the extension is updated. The default model is shared by `Translate Text`, `Translate & Paste`, and `Capture Text & Translate`; expression coaching belongs in **Say It Right**.

For the Anthropic-compatible endpoints (DeepSeek v4 and MiMo v2.5), the extension explicitly sends `thinking: { type: "disabled" }`. Those families default to thinking-on, which adds first-token latency and silently ignores `temperature`; disabling thinking keeps translation responses snappy and respects the configured style.

Provider quality, speed, pricing, and availability depend on your own account, selected endpoint, and selected model.

## Translation Style

The default translation prompt prefers meaning-first, natural target-language wording. In other words, it tries to answer: "How would a native speaker naturally say the same thing?"

You can still make the output more constrained when needed:

- **Translation Style**: Balanced, Faithful, Polished, Academic.
- **Prompt Profile**: Capture Text, General Translation, Technical / Developer, Academic Writing, Legal / Policy, Subtitle / Conversation, Custom Only.
- **Custom Prompt Instructions**: add your own glossary, audience, tone, or formatting rule.

These settings are meant to help with different reading and writing situations. They are not a guarantee of correctness, especially for specialized legal, academic, medical, or technical material.

Every built-in translation prompt includes SkillOpt-style validation gates before the model returns its final answer: preserve source meaning, avoid invented context, repair only obvious OCR artifacts, keep the target language natural, and return the translation only. The gates are guardrails, not a substitute for human review.

## OCR

Screenshot features can use several OCR paths:

- **Local macOS Vision**: the default local OCR path.
- **Tesseract Local**: optional local OCR, for users who have Tesseract installed.
- **Baidu OCR API**: optional API OCR with language hints, general or accurate endpoint, and paragraph grouping.
- **Google Gemini (multimodal)**: optional API OCR that reuses the configured Gemini key and multimodal model.
- **OpenAI Vision (multimodal)**: optional API OCR that reuses the configured OpenAI key, with a separate OCR model override when needed.

If an API OCR engine fails and fallback is enabled, the extension tries local macOS Vision on the same screenshot. OCR is still imperfect, so the screenshot translation flow lets you review and edit extracted text before translating.

## Read Aloud

Translation results can be read aloud with Qwen-TTS through Alibaba Cloud Model Studio / DashScope or Gemini TTS. Choose the voice provider and active voice model from **Settings** or the action panel. Qwen defaults to `qwen3-tts-flash`; choose `qwen3-tts-instruct-flash` when you want style instructions or slow, teacher-like reading. The multilingual Qwen voices (`Cherry`, `Serena`, `Ethan`, `Chelsie`) cover all 11 supported `language_type` values (Auto, Chinese, English, French, German, Italian, Japanese, Korean, Portuguese, Russian, Spanish). Gemini TTS remains available on `gemini-3.1-flash-tts-preview` with eight prebuilt voices.

Read-aloud is a convenience feature, not a full audiobook or speech production tool.

## 中文说明

AI Translate 是一个比较轻量的 Raycast 扩展，主要服务三个日常场景：选中文本翻译、截图文字翻译，以及截图/OCR 文本整理。

它的目标不是做一个“万能翻译器”，也不替代人工审校。更合适的用法是：你在读网页、PDF、软件界面、聊天记录或英文草稿时，想快速得到一个可用的译文或 OCR 文本，然后再根据具体语境自己判断。

目前它有几个特点：

- **以意译和自然表达为默认方向**：默认提示词更重视目标语言里的自然说法，而不是逐词对应。
- **适合不可复制文本**：截图后可以先 OCR，再检查识别结果，最后翻译。
- **支持多个模型服务商**：可以按自己的 API key 启用 DeepSeek（`deepseek-v4-flash`/`deepseek-v4-pro`，Anthropic-compatible 路径并默认关闭 thinking）、MiniMax（默认 `MiniMax-M3`，Anthropic-compatible 路径）、小米 MiMo（`mimo-v2.5`/`mimo-v2.5-pro`，同上）、Gemini（默认 `gemini-3.5-flash`/`gemini-3.1-pro-preview`）、OpenAI / ChatGPT（默认 `gpt-4.1-mini`/`gpt-4.1`，GPT-5.x 推理模型自动加 `reasoning_effort=minimal`）。
- **可比较多个 provider 的输出**：开启多个 provider 后，可以在同一个列表里看不同模型的结果、耗时和状态。
- **支持快速替换工作流**：`Translate & Paste` 适合绑定全局快捷键，直接把结果粘回原位置。
- **保留本地历史**：复制或粘贴过的翻译结果会进入本地历史，方便回看；旧版本留下的改写记录仍可显示。
- **默认模型与运行时选择分层**：`Settings` / Preferences 管稳定默认值，包括翻译与截图翻译共用的默认 provider/model；Action Panel 管当前任务里的 provider 范围、具体模型、朗读 provider/model、翻译风格、提示词场景、OCR engine 和自定义 prompt。

请注意，法律文本、学术文本、合同、公开发布内容和高风险材料仍然需要人工核验。模型输出可能误解上下文、遗漏限定语，OCR 也可能识别错字。

## Privacy Notes

This extension stores history locally through Raycast storage.

When you run translation, API OCR, or TTS, the relevant text or OCR image data may be sent to the provider you configured. Please review each provider's own privacy and data policy before sending sensitive material.

## Keyboard Shortcuts

Raycast extensions cannot assign global hotkeys by themselves. Open Raycast Settings, find **AI Translate**, and assign hotkeys to the commands you use most.

Useful in-command shortcuts include:

| Shortcut      | Action                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| `Cmd+M`       | Switch active model.                                                             |
| `Cmd+Shift+M` | Switch between all enabled providers and a single provider in translation views. |
| `Cmd+P`       | Switch prompt profile.                                                           |
| `Cmd+Y`       | Switch translation style.                                                        |
| `Cmd+S`       | Read translation text aloud.                                                     |
| `Cmd+Opt+S`   | Read aloud slowly.                                                               |
| `Cmd+Shift+S` | Read source text aloud.                                                          |
| `Cmd+R`       | Retry translation, or retake in `Capture Text`.                                  |
| `Cmd+Shift+R` | Retake in `Capture Text & Translate`.                                            |
| `Cmd+L`       | Strip line breaks in `Capture Text`.                                             |
| `Cmd+Shift+P` | Auto paragraph in `Capture Text`.                                                |
| `Cmd+Enter`   | Paste translation or translate OCR text.                                         |

## Development

```bash
npm install
npm run dev
```

`npm run dev` builds the local OCR helper and starts Raycast development mode. The checked-in icon assets are the source of truth. The first screenshot OCR run may require macOS Screen Recording permission for Raycast.
