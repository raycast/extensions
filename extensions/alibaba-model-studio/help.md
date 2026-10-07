# Setting up Alibaba Model Studio

This extension adds Alibaba Cloud Model Studio (Bailian / DashScope) models — Qwen, GLM, Kimi, DeepSeek and more — to Raycast's AI Chat, Quick AI and AI Commands.

## 1. Create an API key

Pick **one** region — keys are region-bound and won't work anywhere else:

- **International** ([modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com)): open **API Keys**, create a pay-as-you-go key
- **China** ([bailian.console.aliyun.com](https://bailian.console.aliyun.com)): open **API Keys**, create a pay-as-you-go key

## 2. Fill in the form

- **API Key** — paste the key you just created
- **Platform** — pick **Pay-as-you-go (International)** or **Pay-as-you-go (China)** to match; pick **Custom base URL** for any other OpenAI-compatible DashScope endpoint

> ⚠️ A key from one region will not work on the other — requests fail with `401 invalid_api_key`. If that happens, run the extension's **Check Setup** command to diagnose.

> 💡 **Pay-as-you-go keys only.** Token Plan and Coding Plan keys (`sk-sp-…`) use plan-specific endpoints and are **not supported** by this extension — plan subscriptions are limited to their own supported surfaces. Create a pay-as-you-go key as described above.

> 📌 **Picked Custom base URL?** The setup form only asks for the API Key and Platform — it never asks for the URL itself. After finishing the form:

1. Open **Raycast Settings → Extensions → Alibaba Model Studio**
2. Set **Custom Base URL** to your HTTPS endpoint (e.g. `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`)
3. Run the **Refresh Models** command

The **Check Setup** command can validate a URL, but nothing typed there is ever saved.

## 3. Enable the models in Raycast

1. You need a **Raycast Pro** subscription (Raycast's requirement for extension-provided AI models)
2. Open **Raycast Settings → AI** and allow models from this extension (or opt in via the model picker)
3. Open AI Chat or Quick AI, open the model picker, and choose a model — `qwen3.7-plus` or `qwen-plus` are good first tests

Run the extension's **Show Models** command any time to see the exact list of models being provided, with their context windows and capabilities.

If models don't show up or chats fail, run **Check Setup** from this extension to validate your key and platform against the live API.
