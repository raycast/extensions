# TweetCraft for Gemini

把中文想法改写成适合 X 的自然英文，并自动复制到剪贴板。TweetCraft 是一个本地优先、键盘优先的 Raycast 扩展。

## 命令

| 推荐 Alias | 命令                     | 用途                           |
| ---------- | ------------------------ | ------------------------------ |
| `tp`       | Natural English Post     | 自然、日常、保留原本语气       |
| `tpx`      | Punchy English Post      | 更鲜明的开头和更紧凑的结构     |
| `tps`      | Short English Post       | 压缩到约 140 个字符            |
| `tpr`      | Natural English Reply    | 自然的英文回复                 |
| `tph`      | Recent TweetCraft Drafts | 找回、复制、重试或删除本地草稿 |

`Check Gemini Setup` 用来检查模型和网络连接。

## 配置

1. 从 Raycast Store 安装 TweetCraft。
2. 在 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建 Gemini API Key。
3. 首次运行任意 TweetCraft 命令时，在 Raycast 扩展设置中填写 API Key。
4. 可选：在各命令的 Raycast 设置中添加上表 Alias。

网络模式默认是 Auto。没有配置代理时直接连接；填写 HTTP 或 HTTPS 代理后，Auto 会先使用代理，仅在代理连接失败时回退直连。诊断信息不会显示代理用户名和密码。

## 本地草稿保护

每次改写都会先把中文写入 Raycast 的扩展本地存储，然后才请求 Gemini。

- 成功时复制英文；失败时复制原中文。
- 本地保存失败时不会发起 Gemini 请求。
- 最近最多保留 50 条，30 天未更新后自动清理。
- 同一模式下，五分钟内重复提交相同中文会更新原记录。
- 重试会更新原记录，不会另建重复记录。
- 历史可保存中文、英文、模式、时间、次数、状态和安全的错误分类，但不会保存 API Key。

## 隐私与 Gemini 数据使用

TweetCraft 没有作者运营的服务器、分析服务或云端历史。草稿历史只保存在 Raycast 的扩展本地存储。只有当前改写或连接检查所需的文本会由扩展直接发送给 Google Gemini API；重试会再次发送对应草稿。

Google 如何处理提交内容取决于 Gemini API 服务和计费层级。免费服务与付费服务的数据使用条款不同。发送敏感内容前，请阅读 [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) 和 [Gemini API logs and datasets](https://ai.google.dev/gemini-api/docs/logs-policy)。

不要提交秘密信息，或你无权提供给 Google 的内容。

## 本地开发

需要 Node.js 22.22.2 或更高版本，以及 macOS 上的 Raycast。

```bash
npm install
npm test
npm run build
npm run lint
npm run dev
```

项目约束见 [AGENTS.md](AGENTS.md)，提示词设计见 [PROMPTS.md](PROMPTS.md)。
