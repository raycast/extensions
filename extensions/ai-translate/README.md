# AI Translate for Raycast

AI Translate is a Raycast extension for fast screenshot OCR translation, powered by BYOK AI providers.

Capture a screenshot, extract the text, translate it with the AI model you control, and hear the result read aloud. The goal is to make the common "I can see the text, but I cannot select it" moment feel effortless.

Many translation extensions still center on conventional machine translation engines. They are fast, but they often miss context, tone, domain vocabulary, and the structure of long sentences. AI Translate sends your text to an LLM, so translations read like real sentences rather than word-by-word conversions.

The extension prioritizes cost-effective, high-quality model providers such as DeepSeek, Xiaomi MiMo, MiniMax, and Kimi, while still supporting OpenAI / ChatGPT and Gemini. If you already subscribe to a Token Plan, you can bring your own API key, base URL, and model ID directly into Raycast.

## Features

- **Screenshot Translate**: capture a screen region, run OCR, review the source text, and translate with multiple providers side by side. Switch models and compare results without leaving the view.
- **Screenshot OCR**: capture a screen region, edit the extracted text, strip line breaks, auto-paragraph, copy, or send to translate.
- **Translate**: translate selected text from any app, or type text directly in the search bar.
- **Translation Settings**: configure model tier, prompt profile, translation style, and custom instructions from a dedicated settings form.
- **Model tier system**: switch between Fast (flash/mini models) and Pro (best models) with one keystroke. Custom tier uses model IDs from preferences for new or unlisted models.
- **TTS read-aloud**: hear translations and source text read aloud using Gemini 3.1 Flash TTS (requires Gemini API key).
- **In-UI controls**: switch model tier (⌘M), prompt profile (⌘P), and translation style (⌘Y) without leaving the translate view. Changes take effect immediately and persist across sessions.
- **Multi-provider comparison**: see translations from all enabled providers at once, with model name, duration, and status in each row.
- **Baidu OCR**: language auto-detect, paragraph grouping, accurate or general endpoint, with local macOS Vision fallback.
- **OCR text processing**: strip line breaks (⌘L) and auto-paragraph (⌘⇧P) directly in the OCR result editor.

## Commands

| Command | Mode | Purpose |
| --- | --- | --- |
| **Translate** | View | Translate selected text, typed text, or text passed from other commands. Compare providers, switch models, read aloud. |
| **Screenshot Translate** | View | Capture a screen region, OCR, review source text, and translate with all enabled providers. |
| **Screenshot OCR** | View | Capture a screen region, edit the OCR result, strip line breaks, auto-paragraph, copy, or send to translate. |
| **Translation Settings** | View | Configure model tier, prompt profile, translation style, and custom instructions in a dedicated form. |

## Model Tier System

Instead of manually typing model names, select a tier and every provider uses the right model automatically:

| Provider | Fast | Pro |
| --- | --- | --- |
| DeepSeek | `deepseek-v4-flash` | `deepseek-v4-pro` |
| Xiaomi MiMo | `mimo-v2-flash` | `mimo-v2.5-pro` |
| MiniMax | `MiniMax-M2.7-highspeed` | `MiniMax-M2.7-highspeed` |
| Gemini | `gemini-2.5-flash` | `gemini-2.5-pro` |
| Kimi | `kimi-k2.6` | `kimi-k2.6` |
| OpenAI | `gpt-4.1-mini` | `gpt-4.1` |

**Custom** tier uses model IDs from extension preferences, so newer models can be entered without updating the extension.

## Prompt Customization

`Prompt Profile` gives you built-in instruction frames for common translation scenarios:

- **Screenshot OCR**: repair OCR artifacts and keep UI text concise.
- **General Translation**: everyday sentence and paragraph translation.
- **Technical / Developer**: preserve APIs, commands, code identifiers, logs, and filenames.
- **Academic Writing**: preserve argument structure, citations, and domain terminology.
- **Legal / Policy**: preserve defined terms, obligations, conditions, and legal modality.
- **Subtitle / Conversation**: use natural spoken phrasing.
- **Custom Only**: use your own instruction frame.

Switch profiles from the translate view with ⌘P, or set them in the **Translation Settings** command.

`Custom Instructions` lets you add reusable guidance such as a preferred glossary, audience, tone, or formatting rule. These are appended to every translation request.

## AI Provider Defaults

| Provider | Protocol | Base URL | Default Model |
| --- | --- | --- | --- |
| DeepSeek | Anthropic-compatible Messages | `https://api.deepseek.com/anthropic` | `deepseek-v4-flash` |
| Xiaomi MiMo | Token Plan / Anthropic-compatible | `https://token-plan-cn.xiaomimimo.com/anthropic` | `mimo-v2-flash` |
| MiniMax | Token Plan / Anthropic-compatible | `https://api.minimaxi.com/anthropic` | `MiniMax-M2.7-highspeed` |
| Kimi | Anthropic-compatible Coding | `https://api.kimi.com/coding/` | `kimi-k2.6` |
| Gemini | Native Gemini API | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.5-flash` |
| OpenAI | Native Chat Completions API | `https://api.openai.com/v1` | `gpt-4.1-mini` |

## Official API Documentation

| Provider | Official documentation |
| --- | --- |
| DeepSeek | [Anthropic API](https://api-docs.deepseek.com/guides/anthropic_api) |
| Xiaomi MiMo | [Anthropic API Compatibility](https://platform.xiaomimimo.com/static/docs/api/chat/anthropic-api.md), [Token Plan Quick Access](https://platform.xiaomimimo.com/static/docs/tokenplan/quick-access.md) |
| MiniMax | [Anthropic API Compatibility](https://platform.minimaxi.com/docs/api-reference/text-anthropic-api), [Token Plan Quickstart](https://platform.minimaxi.com/docs/token-plan/quickstart) |
| Gemini | [Text Generation](https://ai.google.dev/gemini-api/docs/text-generation), [Speech Generation (TTS)](https://ai.google.dev/gemini-api/docs/speech-generation) |
| Kimi | [Agent Integration](https://platform.kimi.ai/docs/guide/agent-support), [API Overview](https://platform.kimi.ai/docs/api/overview) |
| OpenAI | [Chat Completions API Reference](https://platform.openai.com/docs/api-reference/chat/create) |

| OCR Engine | Official documentation |
| --- | --- |
| Baidu OCR API | [General Text Recognition](https://cloud.baidu.com/doc/OCR/s/zk3h7xz52), [Accurate Text Recognition](https://cloud.baidu.com/doc/OCR/s/1k3h7y3db) |

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| ⌘M | Switch model tier (Fast / Pro / Custom) |
| ⌘P | Switch prompt profile |
| ⌘Y | Switch translation style |
| ⌘S | Read translation aloud (TTS) |
| ⌘⇧S | Read source text aloud (TTS) |
| ⌘R | Retry translation / Retake screenshot |
| ⌘⇧C | Copy source text / Copy without line breaks |
| ⌘L | Strip line breaks (Screenshot OCR) |
| ⌘⇧P | Auto paragraph (Screenshot OCR) |
| ⌘⏎ | Paste translation / Translate OCR text |

Raycast extensions cannot force global hotkeys from code. Open Raycast Settings > Extensions > AI Translate and assign your preferred hotkeys to each command.

## OCR Engine Notes

- **Local macOS Vision**: the default; fast, private, network-free.
- **Tesseract Local**: install with `brew install tesseract`, configure languages such as `eng+chi_sim`.
- **Baidu OCR API**: `accurate_basic` supports auto language detection, paragraph grouping, and up to 10 MB / 8192 px images. `general_basic` is faster for simple screenshots.

If an API OCR engine fails, the extension falls back to local macOS Vision on the same screenshot.

## Development

```bash
npm install
npm run dev
```

`npm run dev` generates icons and compiles the Swift OCR helper before starting Raycast development mode. The first screenshot OCR run may require macOS Screen Recording permission for Raycast.
