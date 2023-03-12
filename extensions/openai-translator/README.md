# OpenAI Translator

[Raycast](https://www.raycast.com/) extension for translation based on ChatGPT API.

# Insipired By

- [yetone/openai-translator](https://github.com/yetone/openai-translator)
- [yihong0618/iWhat](https://github.com/yihong0618/iWhat)

# Learn(Cpoy) a lot from

- [yetone/openai-translator](https://github.com/yetone/openai-translator) (MIT License)
- [abielzulio/chatgpt-raycast](https://github.com/abielzulio/chatgpt-raycast) (MIT License)

# Install

## Manual

``` shell
git clone https://github.com/douo/raycast-openai-translator.git
cd raycast-openai-translator
npm install && npm run dev
```

After the extension command show up, You can stop(`Ctrl-c`) the server safely.

## Store

Waitting  Raycast's review (raycast/extensions#))

# Feature

![Intro](metadata/configuration.png)

感谢 [yetone/openai-translator](https://github.com/yetone/openai-translator)：

- 翻译
- 润色
- 总结

![Commands](metadata/commands.png)
![Translate](metadata/translate.png)

来做

- What/What is it?(文本识别) (感谢 [yihong0618/iWhat](https://github.com/yihong0618/iWhat) 的 Prompts)

![What](metadata/what-zh.png)

来自 Raycast

- 自动导入当前选择文本
- 自动导入剪切板文本
- 可绑定全局快捷键

![Actions](metadata/actions.png)


其他

- 历史记录
- 文本复制
- 流式文本显示
- 手动指定文本语言（自动检测在混合有多语言字符的情况下还不太靠谱）
- 自定义 API URL
- [ ] Proxy
- [ ] i18n
- [ ] TTS

![Stream UI](metadata/stream-text.png)
![Lang Dropdown](metadata/lang-dropdown.png)
![Empty](metadata/empty.png)
