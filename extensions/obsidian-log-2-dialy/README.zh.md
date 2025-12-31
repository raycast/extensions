# Obsidian: log 2 daily（中文）

通过 Raycast 快速将片段插入 Obsidian 的当日日记。

## 功能

- 读取 Vault 下的 `.obsidian/daily-notes.json`（也兼容 `.obsiidan/daily-notes.json`）中的 `folder` 和 `format` 来定位当日日记。
- 支持常见日期格式，例如 `YYYY-MM-DD` 或 `YYYY/MM/DD`；支持 `YYYY/YY/MM/M/DD/D` 这些 token，包含 `/` 时会生成多级文件夹。
- 两种记录模式：`Callout`（仅时间的引用块）和 `Plain text`（`**HH:MM**` 后接输入内容）。
- 可配置插入的标题（默认 `## Temp Notes`）；如果日记不存在，会通过 Obsidian URI 唤起创建。

## 设置

1. 安装依赖：`pnpm install`
2. 开发模式（热重载）：`pnpm dev`（Raycast 中会显示在 “Development” 分组）
3. 在 Raycast 命令偏好中设置：
   - `Obsidian Vault Path`（Vault 根目录）
   - `Target Heading`（可选，默认 `## Temp Notes`）
   - `Record Mode`（`Callout` 或 `Plain text`）

## 使用

1. 保持 `pnpm dev` 运行。
2. 在 Raycast 打开命令，输入内容，按 `Cmd+Enter` 提交。
3. 建议在 Raycast 为该命令设置快捷键（Settings → Extensions → 你的命令 → Set Hotkey），便于快速插入。

## 说明

- 如果当日日记不存在，会调用 Obsidian 创建。
- 多行输入会被保留。Callout 模式会在每行前加 `> `；Plain 模式按原文插入。
