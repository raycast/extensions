# OpenAI Translator

[Raycast](https://www.raycast.com/) extension for translation based on ChatGPT API.

https://user-images.githubusercontent.com/743074/226975894-de840861-d1c9-4c9e-8fe1-636f568570fe.mov

# Insipired By

- [yetone/openai-translator](https://github.com/yetone/openai-translator)
- [yihong0618/iWhat](https://github.com/yihong0618/iWhat)

# Learn a lot from

- [yetone/openai-translator](https://github.com/yetone/openai-translator) (MIT License)
- [abielzulio/chatgpt-raycast](https://github.com/abielzulio/chatgpt-raycast) (MIT License)

# Install

## Store

[Raycast OpenAI Translator](https://www.raycast.com/douo/openai-translator)


## Manual

``` shell
git clone https://github.com/douo/raycast-openai-translator.git
cd raycast-openai-translator
npm install && npm run dev
```

After the extension command show up, You can stop(`Ctrl-c`) the server safely.


# Feature

![Intro](doc/configuration.png)

Get your [OpenAI](https://platform.openai.com/account/api-keys) API Keys

## Main Feature

- Selected text translation
- Screencapture translation（Powered by macOS Vision API）
- Clipboard text translation
- Global shortcut(Go to the Raycast extension configuration page to configure it manually)

![openai-translator-10](https://user-images.githubusercontent.com/743074/226171648-d138308b-837e-4b79-a84e-3f2173958066.png)

![Actions](doc/actions.png)

## Translation Mode

![Commands](doc/commands.png)

Thanks to [yetone/openai-translator](https://github.com/yetone/openai-translator)：

- Translate
- Polishing
- Summarize

![Translate](doc/translate.png)

- What/What is it? (Thanks to [yihong0618/iWhat](https://github.com/yihong0618/iWhat) 的 Prompts)

![What](doc/what-en.png)


## Others

- [x] History records
- [x] Text copy
- [x] Stream text display
- [x] Manually specify text language (automatic detection is not reliable when mixing multiple languages)
- [x] Custom API Entrypoint
- [ ] Proxy
- [ ] i18n
- [ ] TTS

![Stream UI](doc/stream-text.png)
![Lang Dropdown](doc/lang-dropdown.png)
![Empty](doc/empty.png)

# How to configure shortcut to selected text query

- Configure the extension(`⌘+⇧+,`).
  1. Select "Query Selected"
  2. Setup shortcut
  3. Make sure "Query Mode" is "Translate".

![Enable Global Shortcuts](doc/query-selected.png)
