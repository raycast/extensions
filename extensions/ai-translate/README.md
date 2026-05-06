# AI Translate for Raycast

AI Translate is a Raycast extension for fast screenshot OCR translation.

Version 1.0.0 is intentionally focused: take a screenshot quickly, extract the text reliably, and translate it with as little friction as possible. The goal is not to become a full translation suite. It is to make the common "I can see the text, but I cannot select it" moment feel effortless.

Many translation extensions still center on conventional machine translation engines. They are fast, but they often miss context, tone, domain vocabulary, and the structure of long sentences. AI Translate is built for a newer workflow: capture the text you are looking at, send it to an AI model you control, and get a translation that reads like a real sentence rather than a word-by-word conversion.

The extension prioritizes cost-effective, high-quality China-based model providers such as DeepSeek, Xiaomi MiMo, MiniMax, and Kimi, while still supporting OpenAI / ChatGPT and Gemini for users who prefer those ecosystems. If you already subscribe to a Token Plan or provider-specific plan, you can bring your own API key, base URL, and model ID directly into Raycast.

## Features

- Translate screenshots with `Translate Screenshot`: capture a region, run OCR, then translate the recognized text.
- Review OCR results with `Extract Text from Screenshot`: capture a region, edit the extracted text, copy it, compact it, translate it, or retake the screenshot.
- Copy OCR text silently with `Copy Text from Screenshot`: capture a region and copy the recognized text directly to the clipboard.
- Translate selected text from any app with `Translate Selected Text` when selection is available.
- Use local or API OCR engines: macOS Vision, Tesseract, Baidu OCR API, or a self-hosted PaddleOCR HTTP service.
- Compare multiple AI providers in one result view.
- Configure provider order, target language, translation style, model ID, base URL, and API key.

## Why Screenshots

Raycast's built-in translation is useful when the source text can be selected or passed as plain text. But many real workflows do not expose text cleanly: app UI, images, PDFs, slides, videos, remote desktops, protected documents, and web pages with broken selection all get in the way.

Raycast's built-in AI features also do not provide this level of model routing for translation. AI Translate lets you choose the provider, model ID, base URL, and API key yourself, so a translation workflow can use the exact model plan you already pay for.

In those cases, a screenshot is the most reliable input. AI Translate treats screenshot capture as the primary workflow, then layers OCR and AI translation on top of it. You can bind a hotkey, capture the exact region you care about, and translate what is actually visible on the screen.

## Why AI Translation

- **Better sentence quality**: LLMs are better at preserving context, pronouns, idioms, tone, technical terms, and academic phrasing than traditional machine translation.
- **Cost control**: OpenAI and Claude-class providers can be expensive for everyday translation. This extension is designed to work well with cost-effective providers such as DeepSeek, Xiaomi MiMo, MiniMax, and Kimi.
- **Token Plan friendly**: Developers who already pay for Xiaomi MiMo, MiniMax, Kimi, or other provider-specific Token Plans / Coding Plans can reuse those credentials, route translation to the right model, and get more value from an existing subscription.
- **Provider independence**: OpenAI / ChatGPT and Gemini are also supported, so you can pick the model that fits your quality, latency, and budget.
- **Screenshot-native workflow**: Translate text that cannot be selected, including app UI, images, PDFs, slides, websites, and videos.

## Commands

| Command                        | Purpose                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `Translate Selected Text`      | Translate selected text, typed text, or a fallback argument.                                   |
| `Translate Screenshot`         | Capture a screen region, run OCR, and send the recognized text to the translation view.        |
| `Extract Text from Screenshot` | Capture a screen region and open an editable OCR result view with copy, translate, and retake. |
| `Copy Text from Screenshot`    | Capture a screen region, run OCR, copy the recognized text, and stay out of the user's way.    |

## AI Provider Defaults

| Provider    | Protocol                          | Base URL                                           | Default Model       |
| ----------- | --------------------------------- | -------------------------------------------------- | ------------------- |
| DeepSeek    | Anthropic-compatible Messages     | `https://api.deepseek.com/anthropic`               | `deepseek-v4-flash` |
| Xiaomi MiMo | Token Plan / Anthropic-compatible | `https://token-plan-cn.xiaomimimo.com/anthropic`   | `mimo-v2-flash`     |
| MiniMax     | Token Plan / Anthropic-compatible | `https://api.minimaxi.com/anthropic`               | `MiniMax-M2.7`      |
| Kimi        | Anthropic-compatible Messages     | `https://api.moonshot.ai/anthropic`                | `kimi-k2.6`         |
| Gemini      | Native Gemini API                 | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.5-flash`  |
| OpenAI      | Native Chat Completions API       | `https://api.openai.com/v1`                        | `gpt-4.1-mini`      |

DeepSeek, Xiaomi MiMo, MiniMax, and Kimi use a single Anthropic-compatible entrypoint each. The extension appends `/v1/messages` automatically. OpenAI and Gemini use their native protocols. Model preferences remain editable text fields so newer model IDs can be entered without changing the extension.

Model IDs worth trying:

- Xiaomi MiMo: `mimo-v2.5`, `mimo-v2.5-pro`, `mimo-v2-pro`, `mimo-v2-omni`
- MiniMax: `MiniMax-M2.7-highspeed`
- Kimi: `kimi-k2.5`, `moonshot-v1-8k`, `moonshot-v1-32k`, `moonshot-v1-128k`

## Official API Documentation

| Provider         | Integration path                           | Official documentation                                                                                                                                                                                 |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DeepSeek         | Anthropic-compatible Messages              | [Anthropic API](https://api-docs.deepseek.com/guides/anthropic_api)                                                                                                                                    |
| Xiaomi MiMo      | Token Plan / Anthropic-compatible Messages | [Anthropic API Compatibility](https://platform.xiaomimimo.com/static/docs/api/chat/anthropic-api.md), [Token Plan Quick Access](https://platform.xiaomimimo.com/static/docs/tokenplan/quick-access.md) |
| MiniMax          | Token Plan / Anthropic-compatible Messages | [Anthropic API Compatibility](https://platform.minimaxi.com/docs/api-reference/text-anthropic-api), [Token Plan Quickstart](https://platform.minimaxi.com/docs/token-plan/quickstart)                  |
| Gemini           | Gemini `generateContent`                   | [Text Generation](https://ai.google.dev/gemini-api/docs/text-generation), [Gemini API Reference](https://ai.google.dev/gemini-api/docs/api-overview)                                                   |
| Kimi             | Anthropic-compatible agent integration     | [Claude Code / Cline / RooCode Integration](https://platform.kimi.ai/docs/guide/agent-support), [API Overview](https://platform.kimi.ai/docs/api/overview)                                             |
| OpenAI / ChatGPT | Chat Completions                           | [Chat Completions API Reference](https://platform.openai.com/docs/api-reference/chat/create)                                                                                                           |

| OCR Engine     | Official documentation                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baidu OCR API  | [General Text Recognition](https://cloud.baidu.com/doc/OCR/s/zk3h7xz52), [Accurate Text Recognition](https://cloud.baidu.com/doc/OCR/s/1k3h7y3db), [Authentication](https://cloud.baidu.com/doc/AI_REFERENCE/s/um3zhy50e) |
| PaddleOCR HTTP | [Server Deployment](https://paddlepaddle.github.io/PaddleOCR/main/en/version3.x/deployment/serving.html), [OCR Pipeline Usage](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html)                       |

## Keyboard Shortcuts

Raycast extensions cannot force global hotkeys from code. After installing the extension, open Raycast Settings > Extensions > AI Translate and assign your preferred hotkeys to `Translate Screenshot`, `Extract Text from Screenshot`, or `Copy Text from Screenshot`.

## Development

```bash
npm install
npm run dev
```

`npm run dev` generates the icon and compiles the Swift OCR helper before starting Raycast development mode. The first screenshot OCR run may require macOS Screen Recording permission for Raycast.

## OCR Engine Notes

- `Local macOS Vision`: the default option; fast, private, and network-free.
- `Tesseract Local`: a lightweight local OCR pipeline inspired by omarchy-cmd-ocr. Install it with `brew install tesseract`, then configure languages such as `eng+chi_sim` in `Tesseract Languages`.
- `Baidu OCR API`: a synchronous OCR API suitable for screenshot translation. `general_basic` is faster; `accurate_basic` is more robust for complex screenshots.
- `PaddleOCR HTTP`: use this with a local or self-hosted PaddleOCR service. The default endpoint is `http://localhost:8080/ocr`.

If an API OCR engine fails, the extension can fall back to local macOS Vision OCR on the same screenshot.

`OCR Text Layout` follows the same practical split as omarchy-cmd-ocr: `Formatted` preserves line breaks, while `Compact` collapses whitespace into a single line for cleaner sentence translation.
