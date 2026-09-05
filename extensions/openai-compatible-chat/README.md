# OpenAI Compatible Chat

Use your own OpenAI-compatible AI providers directly inside Raycast for Windows. The extension includes streaming multi-turn chat, multiple provider profiles, model discovery, encrypted local history, and support for reasoning streams used by GLM and similar models.

This extension does **not** use Raycast AI and does not require a Raycast AI subscription. Requests go directly from your computer to the provider you configure.

## Quick Setup

1. Run **Manage AI Providers**.
2. Choose a verified preset or **Custom OpenAI-Compatible**.
3. Enter the API key. Local endpoints such as Ollama and LM Studio can leave it blank.
4. Press `Ctrl+R` to discover and select multiple models. If the provider does not expose `/models`, enter multiple model IDs manually, one per line or separated by commas.
5. Save the provider and run **Ask AI**.

### Ask from Root Search

Raycast reserves `Tab` in Root Search for its built-in Quick AI and does not expose an extension API to override it. This extension uses Raycast's supported Fallback Command flow instead:

1. Open **Settings → Launcher → Fallback Commands**.
2. Add **Ask AI** and move it to the first position.
3. Type a question in Root Search.
4. When the fallback results appear, press `Enter` on **Ask AI**.

The Root Search text is passed to the extension and submitted immediately. Raycast does not allow extensions to add or reorder fallback commands automatically, so steps 1–2 are a one-time manual setup.

## Verified Provider Presets

Every bundled URL below was checked against the provider's official documentation. Model discovery uses `GET <Base URL>/models`; manual model entry remains available when a provider does not expose that endpoint.

| Preset | Base URL | Official documentation |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | [Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions) |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai) |
| DeepSeek | `https://api.deepseek.com` | [First API call](https://api-docs.deepseek.com/) |
| Alibaba Qwen — China | `https://dashscope.aliyuncs.com/compatible-mode/v1` | [Base URLs](https://help.aliyun.com/en/model-studio/base-url) |
| Alibaba Qwen — International | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | [Base URLs](https://help.aliyun.com/en/model-studio/base-url) |
| Zhipu GLM — General | `https://open.bigmodel.cn/api/paas/v4` | [API quickstart](https://docs.bigmodel.cn/cn/api/introduction) |
| Zhipu GLM — Coding Plan | `https://open.bigmodel.cn/api/coding/paas/v4` | [Coding endpoint](https://docs.bigmodel.cn/cn/guide/develop/others) |
| Groq | `https://api.groq.com/openai/v1` | [OpenAI compatibility](https://console.groq.com/docs/openai) |
| Mistral AI | `https://api.mistral.ai/v1` | [Chat endpoint](https://docs.mistral.ai/api/endpoint/chat) |
| OpenRouter | `https://openrouter.ai/api/v1` | [Quickstart](https://openrouter.ai/docs/quickstart) |
| Together AI | `https://api.together.ai/v1` | [Chat completions](https://docs.together.ai/reference/chat-completions) |
| SiliconFlow | `https://api.siliconflow.com/v1` | [Quickstart](https://docs.siliconflow.com/cn/userguide/quickstart) |
| Fireworks AI | `https://api.fireworks.ai/inference/v1` | [OpenAI compatibility](https://docs.fireworks.ai/tools-sdks/openai-compatibility) |
| Cerebras | `https://api.cerebras.ai/v1` | [OpenAI compatibility](https://inference-docs.cerebras.ai/resources/openai) |
| Ollama | `http://127.0.0.1:11434/v1` | [OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) |
| LM Studio | `http://127.0.0.1:1234/v1` | [OpenAI compatibility](https://lmstudio.ai/docs/developer/openai-compat) |

Provider APIs change over time. If a preset stops working, edit its Base URL or use the Custom preset while the extension is updated.

## Chat and History

- Responses stream into the Raycast detail view.
- Press `Ctrl+Enter` in a conversation to compose a follow-up.
- Stop an active response, regenerate the last answer, switch provider/model, or copy the answer from the Action Panel.
- `reasoning_content` is saved separately from the final answer and can be shown or hidden.
- Conversation titles are generated locally from the first message; no extra model request is made.
- Provider API keys are stored in Raycast's extension-isolated encrypted LocalStorage.
- Chat files are encrypted with AES-256-GCM in the extension support directory. The encryption key is stored in Raycast's encrypted LocalStorage.
- Conversation count defaults to **Unlimited** and can be changed to any positive number.
- Encrypted chat data has a fixed 10 GB cap. The oldest conversations are removed automatically when the cap is reached.
- The extension contains no analytics or telemetry.

## Compatibility Contract

The endpoint must accept:

```http
POST <Base URL>/chat/completions
Authorization: Bearer <API key>
Content-Type: application/json
```

with a request body containing `model`, `messages`, and `stream: true`. Standard OpenAI SSE chunks, GLM-style `reasoning_content`, and compatible servers that ignore streaming and return a normal JSON completion are supported.

Base URLs containing query strings are intentionally rejected because appending standard paths would be ambiguous. Use a gateway that exposes a normal OpenAI-compatible base URL for those services.

## Development

```powershell
npm install
npm run dev
```

Quality checks:

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

## 中文说明

这是一个 Windows 版 Raycast 扩展，用自己的 OpenAI-compatible 节点替代 Raycast AI。它不调用 Raycast AI，也不要求 Raycast AI 订阅；请求会从本机直接发送到你配置的服务商。

首次使用：

1. 打开 **Manage AI Providers**。
2. 选择已经过官方文档核验的预设，或选择 **Custom OpenAI-Compatible**。
3. 填写 API Key；Ollama、LM Studio 等本地节点可以留空。
4. 按 `Ctrl+R` 自动获取并多选模型；如果节点没有 `/models` 接口，可以每行一个或用逗号分隔，手动填写多个模型 ID。
5. 保存后打开 **Ask AI** 开始聊天。

从主搜索框直接提问：

1. 打开 **Settings → Launcher → Fallback Commands**。
2. 添加 **Ask AI** 并拖到第一位。
3. 回到 Root Search，直接输入完整问题。
4. Fallback 结果出现后，在 **Ask AI** 上按 `Enter`，问题会被原样传入并立即发送。

Raycast 把 Root Search 的 `Tab` 固定绑定给内置 Quick AI，第三方扩展没有覆盖权限；扩展也不能自动修改 Fallback 排序，因此上面的设置需要手动完成一次。之后日常操作就是“输入问题 → Enter”。

聊天支持多轮追问、流式输出、停止生成、重试、模型切换和本地历史。GLM 等模型返回的 `reasoning_content` 会与最终答案分开保存并可隐藏。API Key 存在 Raycast 的隔离加密数据库中；聊天正文使用 AES-256-GCM 加密后保存在扩展目录。会话数量默认不限制，可自行设置；总存储上限为 10 GB，达到后自动清理最旧会话。

## License

MIT
