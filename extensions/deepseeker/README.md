# DeepSeeker - DeepSeek Quick Actions

DeepSeek is a powerful yet cheap LLM. This extension provides quick actions to interact with DeepSeek API. It allows you to quickly ask questions, summarize text, and more. It's a great tool for students, researchers, and anyone who needs quick answers.

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
- [ ] Interaction with Zoo using deeplinks?
- [ ] 📦 More flexibility for personal needs
  - [ ] Prompt zoo
  - [ ] Choose proopt when running the command

## Bugs / TODOs

- [ ] It seems translate will run two times. Need to fix it.
![Translation bug demonstration](./assets/translate-bug.gif)

| Command             | Function                                                     | Use Selected Text? |
| ------------------- | ------------------------------------------------------------ | ------------------ |
| **Ask on Selected** | Ask questions or instruct on the selected text               | ✅                  |
| **Ask LLM**         | Ask questions using pure user query input                    | ❌                  |
| **Summarize**       | Summarize the selected text                                  | ✅                  |
| **Fix**             | Fix the selected text typo and grammar-wise                  | ✅                  |
| **Rephrase**        | Rephrase and improve the writing of the selected text        | ✅                  |
| **Translate**       | Auto translate selected text into target language as setting | ✅                  |
| **What**            | Give a brief explanation of the selected text                | ✅                  |
| **Why**             | Give a brief explanation of the selected declaration         | ✅                  |

> This extension is built highly inspired by [ChatGPT Quick Actions](https://www.raycast.com/alanzchen/chatgpt-quick-actions) by [Alan Chen](https://www.raycast.com/alanzchen).

## Metadatas

<details>
<summary>Wallpaper & Examples</summary>

The wallpaper for the Screenshots is the <https://misc-assets.raycast.com/wallpapers/blue_distortion_2.heic>

All the examples have been generated on [Elon Musk's Wikipedia page 1st Paragraph](https://en.wikipedia.org/wiki/Elon_Musk)

</details>
