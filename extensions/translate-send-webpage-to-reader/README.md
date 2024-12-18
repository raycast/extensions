# Translate and send webpage to Reader

一个 Raycast 扩展，可以将当前活跃网页的内容使用 Raycast AI 自动翻译成中文并发送到 Readwise Reader。

## 功能特点

- 支持从浏览器扩展快速导入当前页面的 Markdown 内容
- 自动将内容翻译成中文（使用 GPT-4o-mini）
- 保留原文格式
- 通过 Readwise Reader API 发送到 Reader Later

## 要求
- [Readwise Reader](https://readwise.io/read) 账号和 API Token

## 配置说明

1. 获取 Readwise API Token:
   - 登录 [Readwise](https://readwise.io/)
   - 访问 [设置页面](https://readwise.io/access_token)
   - 复制你的 API Token

2. 在扩展设置中:
   - 打开 Raycast
   - 找到 "Send Markdown to Reader" 扩展设置
   - 粘贴你的 Readwise API Token