# Ask AI Quick Actions

Ask AI Quick Actions 主要目标是支持自定义 Agent 并且可以通过 deeplinks 快速打开对应的 Agent。 本项目支持自定义 LLM API（只需要使用与 OpenAI 相同的 API）。
DeepSeek LLM is a powerful yet cheap LLM. DeepSeeker is a Raycast extension that allows you to perform one-shot actions with DeepSeek using Raycast.

## Setup
1. 从你选择的 DeepSeek/OPENAI/Doubao 控制台中获取 API key. 比如 `sk-37cd5***********************ac74`。
2. `Custom API Endpoint` 是你使用的 LLM 服务的 API URL。以下是可能的 API URL 列表：
    - DeepSeek: `https://api.deepseek.com/v1`
    - ChatGPT: `https://api.openai.com/v1`
    - Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/`
    - Doubao: `https://ark.cn-beijing.volces.com/api/v3`
3. `LLM Model` 是你选择的 LLM 模型。 比如：`gpt-3.5-turbo`。

### Example for Doubao
1. 打开[豆包大模型](https://console.volcengine.com/ark) ，登录你的账号，登录成功后会跳转到控制台页面，点击`在线推理`，点击创建推理接入点，选择对应模型创建
2. 鼠标悬停在模型名称旁边的详情图标，就能看到接入点 ID，复制接入点 ID 到 `LLM Model`，格式如：`ep-20250215077120-69123`
3. 点击 API Key 管理，点击创建 API Key，复制 `API Key` 到 `LLM Model` 中。
4. 填写 `Custom API Endpoint` 为 `https://ark.cn-beijing.volces.com/api/v3`。

### Deeplinks
1. 首先通过 `Show Agents` 创建新的自定义 Agent。
2. 在 `SHow Agents` 中选中自定义的 Agent 按回车即可创建 Deeplinks。
3. 在 Raycast 中即可使用 Deeplinks 快速打开对应的 Agent。

Enjoy using Ask AI Quick Actions! 🚀

## Features
- [x] 📄 Custom Agent
- [x] 💸 Support Translate command
- [x] 🎨 Multiple models support (Need to support the OpenAI API）
- [ ] 🔍 Support the definition of multiple Models, and different Agents use different Models.

参考了 [Deepseeker](https://github.com/raycast/extensions/extensions/deepseeker/) 和 [google translate](https://github.com/raycast/extensions/extensions/google-translate/)的一些想法和实现。
