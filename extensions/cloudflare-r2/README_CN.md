# Cloudflare R2

一个用于管理 Cloudflare R2 存储桶文件的 Raycast 扩展。

[English](./README.md)

## 功能

- **网格视图**：以 5 列网格布局显示所有文件，支持图片预览
- **上传文件**：上传任意本地文件到 R2 存储桶 (⌘+U)
- **剪贴板上传**：快速上传剪贴板中的图片到 R2 并复制链接
- **预览**：在浏览器中打开文件
- **复制链接**：复制公开链接或预签名链接
- **删除**：从存储桶中删除文件

## 配置

你需要配置以下参数：

| 字段 | 必填 | 说明 |
|------|------|------|
| Account ID | 是 | Cloudflare 账户 ID |
| Access Key ID | 是 | R2 API Token 的 Access Key ID |
| Secret Access Key | 是 | R2 API Token 的 Secret Access Key |
| Bucket Name | 是 | R2 存储桶名称 |
| Public Domain | 否 | 公开访问域名，用于生成预览链接 |

### 如何获取 R2 API Token

1. 进入 [Cloudflare 控制台](https://dash.cloudflare.com)
2. 导航到 R2 概览页面
3. 点击"管理 R2 API 令牌"
4. 创建一个具有适当权限的新 API 令牌
5. 复制 Access Key ID 和 Secret Access Key

## 命令

### Cloudflare R2 Manager

在网格视图中浏览和管理 R2 存储桶文件。

**快捷键：**
- `Enter` - 预览文件
- `⌘+C` - 复制链接
- `⌘+U` - 上传文件
- `⌘+Backspace` - 删除文件

### Upload from Clipboard

快速上传剪贴板中的图片到 R2，并自动复制链接。

## 说明

- 文件使用 UUID 重命名，防止 URL 被猜测
- 文件按上传时间倒序排列（最新的在前）
- 剪贴板上传仅支持图片格式：PNG、JPG、JPEG、GIF、WebP、SVG、ICO、BMP

## 许可证

MIT
