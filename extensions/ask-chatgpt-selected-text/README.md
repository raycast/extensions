# Ask GPT

这个本地 Raycast 扩展读取当前应用中选中的文字，然后通过 macOS 辅助功能把问题发送到已登录的 ChatGPT Classic 客户端。它不调用 OpenAI API，因此不需要 API Key，也不会产生 API 用量费用。

扩展固定使用 ChatGPT Classic（Bundle ID：`com.openai.chat`），从而只进入普通 Chat，不会打开新版 ChatGPT 的 Work 模式。

## 安装

1. 在此目录运行 `npm install`。
2. 运行 `npm run dev`，Raycast 会载入扩展。
3. 在 Raycast 中为“Ask GPT with Selected Text”设置快捷键（建议 `⌥ ⇧ A`）。
4. 在“系统设置 → 隐私与安全性 → 辅助功能”中允许 Raycast 控制电脑。
5. 确认 ChatGPT Classic 已登录你的 ChatGPT Plus 账号。

## 使用

1. 手动提问：在 Raycast 输入“Ask GPT”，按回车后焦点进入问题输入框；输入问题并再次按回车发送。
2. 选中文字：在其他应用中选中文字，直接运行“Ask GPT with Selected Text”的快捷键；扩展立即发送选区，不显示问题输入框。

两个命令属于同一个扩展，手动问题和选中文字不会混合。

每次执行的顺序为：新建普通 Chat → 自动加入背景查询提示词 → 发送选中文字或手动问题。扩展不会输入 `/search` 或声称开启专门的搜索模式；是否实际调用联网工具由 ChatGPT 根据提示词判断。

发送格式是：

```text
请解释以下内容，并联网搜索相关背景：

{选中的文字，或手动输入的问题}
```

## 限制

- ChatGPT Plus 和 OpenAI API 是两套独立服务。本扩展通过 ChatGPT Classic 复用你的 Plus 登录状态，不使用 API。
- 联网提示词只有在用户的 ChatGPT 账号、套餐及当前模型已启用网页搜索能力时才可能触发联网；如果该能力不可用，这段文字只会被当作普通提示词，扩展无法强制开启网页搜索。
- 自动发送依赖 macOS 辅助功能和 ChatGPT 客户端界面快捷键。
- 某些应用或网页禁止 Raycast 直接读取选区时，可先按 `⌘C` 再执行；后续可以增加“读取剪贴板”备用模式。
