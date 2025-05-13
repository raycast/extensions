# Raycast Telegram Collector

一个 Raycast 扩展，让你可以快速将文本保存到你的 Telegram 机器人。

## 功能

- 快速将文本发送到你的 Telegram 机器人
- 支持自定义 Bot Token 和 Chat ID
- 简单易用的界面

## 安装

1. 在 Raycast 扩展商店中搜索 "Telegram Collector"
2. 点击安装

## 配置

首次使用前，你需要配置以下信息：

1. **Bot Token**: 你的 Telegram 机器人 token
   - 从 [@BotFather](https://t.me/botfather) 获取（或创建一个新的机器人来保存所有文本）
   - 格式类似：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

2. **Chat ID**: 你的 Telegram 用户 ID
   - 从 [@userinfobot](https://t.me/userinfobot) 获取你的个人 ID

## 使用方法

Telegram:
- 对于新创建的机器人，你需要先向该机器人发送一条消息来激活它

Raycast:
- 在 Raycast 中搜索 "Saved to Telegram"
- 输入或粘贴要保存的文本
- 按回车发送

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 许可证

MIT 