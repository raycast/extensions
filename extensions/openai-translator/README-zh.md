# OpenAI Translator

[Raycast](https://www.raycast.com/) 基于 ChatGPT API 的 Raycast 翻译扩展。



https://user-images.githubusercontent.com/743074/224527077-8256a26a-bbeb-482e-86fa-74fe435e59fe.mov



# Insipired By

- [yetone/openai-translator](https://github.com/yetone/openai-translator)
- [yihong0618/iWhat](https://github.com/yihong0618/iWhat)

# 参考(Cpoy)

- [yetone/openai-translator](https://github.com/yetone/openai-translator) (MIT License)
- [abielzulio/chatgpt-raycast](https://github.com/abielzulio/chatgpt-raycast) (MIT License)

# 安装

## 手动

``` shell
git clone https://github.com/douo/raycast-openai-translator.git
cd raycast-openai-translator
npm install && npm run dev
```

After the extension command show up, You can stop(`Ctrl-c`) the server safely.

## 商店

等待审核。。。

# 功能

![Intro](metadata/configuration.png)

感谢 [yetone/openai-translator](https://github.com/yetone/openai-translator)：

- 翻译
- 润色
- 总结

![Commands](metadata/commands.png)
![Translate](metadata/translate.png)


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

# 如何配置一键查询

- 配置扩展
  1. 配置全局快捷键
  2. 确保打开自动带入高亮文字和自动开始查询

![打开全局快捷键](https://user-images.githubusercontent.com/743074/224528361-6231ba8f-d8aa-45d7-9a36-cb3889452254.png)

全键盘操作的效果：

https://user-images.githubusercontent.com/743074/224528436-afca923d-b781-4754-86f5-e6b439b3e9e9.mov
