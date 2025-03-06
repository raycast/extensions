# Ask AI Quick Actions

Ask AI Quick Actions aims to support custom Agents and quickly open the corresponding Agent through deeplinks. This project supports custom LLM APIs (only needs to use the same API as OpenAI).
DeepSeek LLM is a powerful yet cheap LLM. DeepSeeker is a Raycast extension that allows you to perform one-shot actions with DeepSeek using Raycast.

## Setup
1. Get your API key from your chosen DeepSeek/OPENAI/Doubao console. For example, `sk-37cd5***********************ac74`.
2. `Custom API Endpoint` is the API URL of the LLM service you are using. Here is a list of possible API URLs:
    - DeepSeek: `https://api.deepseek.com/v1`
    - ChatGPT: `https://api.openai.com/v1`
    - Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/`
    - Doubao: `https://ark.cn-beijing.volces.com/api/v3`
3. `LLM Model` is the LLM model you choose. For example: `gpt-3.5-turbo`.

### Example for Doubao
1. Open [Doubao Large Model](https://console.volcengine.com/ark), log in to your account, after logging in successfully, you will be redirected to the console page, click `Online Inference`, click to create an inference endpoint, and select the corresponding model to create.
2. Hover the mouse over the details icon next to the model name, and you will see the endpoint ID. Copy the endpoint ID to `LLM Model`, the format is like: `ep-20250215077120-69123`.
3. Click API Key Management, click to create an API Key, and copy the `API Key` to `LLM Model`.
4. Fill in `Custom API Endpoint` as `https://ark.cn-beijing.volces.com/api/v3`.

### Deeplinks
1. First, create a new custom Agent through `Show Agents`.
2. In `Show Agents`, select the custom Agent and press Enter to create Deeplinks.
3. You can use Deeplinks in Raycast to quickly open the corresponding Agent.

Enjoy using Ask AI Quick Actions! 🚀

## Features
- [x] 📄 Custom Agent
- [x] 💸 Support Translate command
- [x] 🎨 Multiple models support (Need to support the OpenAI API）
- [ ] 🔍 Support the definition of multiple Models, and different Agents use different Models.

This extension is highly inspired by [Deepseeker](https://github.com/raycast/extensions/extensions/deepseeker/) and [google translate](https://github.com/raycast/extensions/extensions/google-translate/).
