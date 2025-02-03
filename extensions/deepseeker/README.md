# DeepSeeker - DeepSeek Quick Actions

DeepSeek LLM is a powerful yet cheap LLM. DeepSeeker is a Raycast extension that allows you to perform one-shot actions with DeepSeek using Raycast.

While [ChatGPT Quick Actions](https://www.raycast.com/alanzchen/chatgpt-quick-actions) is built for ChatGPT, DeepSeeker is built for DeepSeek. For now, it tries to obey `Multiple Simple` phylosophy. In the future, it tries to provide `more flexibility` for individual various needs.

## Setup

1. Get your DeepSeek API key from [DeepSeek API](https://platform.deepseek.com/api_keys). It's like `sk-37cd5***********************ac74`. Paste it in the `DEEPSEEK_API_KEY` environment variable in Raycast Settings.
2. The `Custom API Endpoint` is optional. Only if you want to use a custom API endpoint such as ChatGPT's API. Leave it empty if you want to use the default DeepSeek API endpoint. A list of possible endpoints:

   - DeepSeek: `https://api.deepseek.com/v1`
   - ChatGPT: `https://api.openai.com/v1`
   - Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/`

3. Choose `DeepSeek-V3` or `DeepSeek-R1` (new reasoning model) as the global preferred model. You can also customize the preferred model for each command.

Enjoy using DeepSeeker! 🚀

## Features

- [x] 🚀 Results Stream in real time
- [x] ⌘ Supports custom keybinding for each action
- [x] 📄 Custom prompt for each action
- [x] 💸 Set token price in settings
- [x] 🌐 Support Translate and Looking Up Words
- [x] 🎨 Multiple models support (Deepseek, OpenAI, Gemini)
- [ ] 🔍 Fix Fallback Feature, e.g., ASK LLM
- [ ] Fix notes
- [ ] Interaction with Zoo using deeplinks?
- [ ] 📦 More flexibility for personal needs
  - [ ] Prompt zoo
  - [ ] Choose proopt when running the command
- [ ] 💬 Conversation Chat mode

> This extension is built highly inspired by [ChatGPT Quick Actions](https://www.raycast.com/alanzchen/chatgpt-quick-actions) by [Alan Chen](https://www.raycast.com/alanzchen).

## Metadatas

<details>
<summary>Wallpaper & Examples</summary>

The wallpaper for the Screenshots is the https://misc-assets.raycast.com/wallpapers/blue_distortion_2.heic

All the examples have been generated on [Elon Musk's Wikipedia page 1st Paragraph](https://en.wikipedia.org/wiki/Elon_Musk)

</details>
