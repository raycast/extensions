# AI Translate for Raycast

AI Translate is a small Raycast extension for everyday translation, screenshot OCR, and English rewriting.

It is built for a modest but common problem: sometimes you want to translate a sentence, rewrite a line of English, or read text from an image without opening a large translation app. AI Translate keeps those steps inside Raycast and lets you bring your own API keys for the model providers you already use.

It does not try to replace professional translation, legal review, or careful human editing. For important writing, citations, contracts, academic text, or public-facing copy, please treat the output as a draft and review it yourself.

## What It Does

- **Translate selected text**: select text in any app, run `Translate`, and compare results from enabled providers.
- **Translate and paste in place**: use `Translate Selection & Paste` when you want a no-window workflow for a global hotkey.
- **Screenshot translation**: capture a screen region, extract text with OCR, review the result, and translate it.
- **Standalone OCR**: use `Screenshot OCR` to capture, edit, copy, strip line breaks, auto-paragraph, or send the text to translation.
- **Rewrite & Coach**: rewrite selected text into more natural English, choose a tone, read the result aloud, and see a short Chinese explanation of why the rewrite sounds more natural.
- **Rewrite & Replace**: rewrite selected text and paste the result back with no window.
- **History**: browse recent translations and rewrites you copied or pasted. History is stored locally.
- **Translation Settings**: adjust model tier, prompt profile, translation style, and custom instructions without digging through every provider setting.

## Main Commands

| Command | Mode | English | 中文 |
| --- | --- | --- | --- |
| `Translate` | View | Translate selected or typed text, with provider comparison and read-aloud actions. | 翻译选中文本或手动输入文本，可比较多个 provider，并支持朗读。 |
| `Translate Selection & Paste` | No-view | Translate selected text with the default provider and paste it back. | 用默认 provider 翻译选中文本，并直接粘回原处。 |
| `Rewrite & Coach` | View | Rewrite text into natural English, explain the changes in Chinese, and read it aloud. | 把文本改写成更自然的英文，并用中文解释为什么这样更地道。 |
| `Rewrite & Replace` | No-view | Rewrite selected text into natural English and paste it back. | 直接把选中文本改写为自然英文并替换原文。 |
| `Screenshot Translate` | View | Capture a region, OCR it, review the text, and translate it. | 截图取字、检查 OCR 结果，再进行翻译。 |
| `Screenshot OCR` | View | Extract text from a screenshot and clean or copy the result. | 从截图中提取文字，并做换行整理、自动分段或复制。 |
| `History` | View | Revisit recent translation and rewrite results. | 查看最近复制或粘贴过的翻译和改写记录。 |
| `Translation Settings` | View | Configure model tier, prompt profile, style, and custom instructions. | 配置模型档位、提示词场景、翻译风格和自定义说明。 |

## Providers

AI Translate is a bring-your-own-key extension. You decide which providers to enable and in what order. The current provider list is:

- DeepSeek
- Xiaomi MiMo
- MiniMax
- Gemini
- Kimi
- OpenAI / ChatGPT

Most provider settings live in Raycast preferences: API key, base URL, model name, timeout, and provider order. You can also switch between **Fast**, **Pro**, and **Custom** model tiers from the extension UI. `Custom` uses the model IDs you enter in preferences, which is useful when providers add new models before the extension is updated.

Provider quality, speed, pricing, and availability depend on your own account, selected endpoint, and selected model.

## Translation Style

The default translation prompt prefers meaning-first, natural target-language wording. In other words, it tries to answer: "How would a native speaker naturally say the same thing?"

You can still make the output more constrained when needed:

- **Translation Style**: Balanced, Faithful, Polished, Academic.
- **Prompt Profile**: Screenshot OCR, General Translation, Technical / Developer, Academic Writing, Legal / Policy, Subtitle / Conversation, Custom Only.
- **Custom Prompt Instructions**: add your own glossary, audience, tone, or formatting rule.

These settings are meant to help with different reading and writing situations. They are not a guarantee of correctness, especially for specialized legal, academic, medical, or technical material.

## OCR

Screenshot features can use several OCR paths:

- **Local macOS Vision**: the default local OCR path.
- **Tesseract Local**: optional local OCR, for users who have Tesseract installed.
- **Baidu OCR API**: optional API OCR with language hints, general or accurate endpoint, and paragraph grouping.
- **Google Gemini (multimodal)**: optional API OCR that reuses the configured Gemini key and multimodal model.
- **OpenAI Vision (multimodal)**: optional API OCR that reuses the configured OpenAI key, with a separate OCR model override when needed.

If an API OCR engine fails and fallback is enabled, the extension tries local macOS Vision on the same screenshot. OCR is still imperfect, so the screenshot translation flow lets you review and edit extracted text before translating.

## Read Aloud

Translation and rewrite results can be read aloud with Gemini TTS when a Gemini API key is configured. You can choose a voice in preferences and use the slow read-aloud option for language practice.

Read-aloud is a convenience feature, not a full audiobook or speech production tool.

## 中文说明

AI Translate 是一个比较轻量的 Raycast 扩展，主要服务三个日常场景：选中文本翻译、截图文字翻译，以及英文表达改写。

它的目标不是做一个“万能翻译器”，也不替代人工审校。更合适的用法是：你在读网页、PDF、软件界面、聊天记录或英文草稿时，想快速得到一个可用的译文、改写稿或 OCR 文本，然后再根据具体语境自己判断。

目前它有几个特点：

- **以意译和自然表达为默认方向**：默认提示词更重视目标语言里的自然说法，而不是逐词对应。
- **适合不可复制文本**：截图后可以先 OCR，再检查识别结果，最后翻译。
- **支持多个模型服务商**：可以按自己的 API key 启用 DeepSeek、小米 MiMo、MiniMax、Gemini、Kimi、OpenAI / ChatGPT。
- **可比较多个 provider 的输出**：开启多个 provider 后，可以在同一个列表里看不同模型的结果、耗时和状态。
- **支持英文改写学习**：`Rewrite & Coach` 会给出更自然的英文表达，并用中文解释具体改动，适合英语写作和口语表达练习。
- **支持快速替换工作流**：`Translate Selection & Paste` 和 `Rewrite & Replace` 适合绑定全局快捷键，直接把结果粘回原位置。
- **保留本地历史**：复制或粘贴过的翻译、改写结果会进入本地历史，方便回看。
- **配置比较细**：可以选择模型档位、翻译风格、提示词场景、OCR engine、自定义 prompt 和 provider 顺序。

请注意，法律文本、学术文本、合同、公开发布内容和高风险材料仍然需要人工核验。模型输出可能误解上下文、遗漏限定语，OCR 也可能识别错字。

## Privacy Notes

This extension stores history locally through Raycast storage.

When you run translation, rewriting, API OCR, or TTS, the relevant text or OCR image data may be sent to the provider you configured. Please review each provider's own privacy and data policy before sending sensitive material.

## Keyboard Shortcuts

Raycast extensions cannot assign global hotkeys by themselves. Open Raycast Settings, find **AI Translate**, and assign hotkeys to the commands you use most.

Useful in-command shortcuts include:

| Shortcut | Action |
| --- | --- |
| `Cmd+M` | Switch model tier, or switch provider in `Rewrite & Coach`. |
| `Cmd+P` | Switch prompt profile. |
| `Cmd+Y` | Switch translation style, or rewrite tone in `Rewrite & Coach`. |
| `Cmd+S` | Read translation or rewritten text aloud. |
| `Cmd+Opt+S` | Read aloud slowly. |
| `Cmd+Shift+S` | Read source text aloud. |
| `Cmd+R` | Retry translation, or retake in `Screenshot OCR`. |
| `Cmd+Shift+R` | Retake in `Screenshot Translate`. |
| `Cmd+L` | Strip line breaks in `Screenshot OCR`. |
| `Cmd+Shift+P` | Auto paragraph in `Screenshot OCR`. |
| `Cmd+Enter` | Paste translation or translate OCR text. |

## Development

```bash
npm install
npm run dev
```

`npm run dev` generates icons, builds the local OCR helper, and starts Raycast development mode. The first screenshot OCR run may require macOS Screen Recording permission for Raycast.
