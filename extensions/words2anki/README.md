# Words to Anki - Raycast Extension

一个 Raycast 扩展，用于快速创建 Anki 单词卡片。通过 DeepSeek AI 自动生成释义和翻译。

## ✨ 功能特性

- 📋 **从剪贴板读取上下文**：复制包含生词的句子/段落
- 🎯 **智能识别生词**：选中要学习的单词
- 🤖 **AI 生成释义**：使用 DeepSeek AI 生成词性、中英文释义和翻译
- 📝 **自动创建 Anki 卡片**：通过 AnkiConnect 直接推送到 Anki
- ⚡ **一键操作**：触发 Raycast 命令即可完成全流程

## 📋 使用前准备

### 1. 安装 AnkiConnect

1. 打开 Anki
2. 工具 → 插件 → 获取插件
3. 输入插件代码：`2055492159`
4. 重启 Anki

### 2. 获取 DeepSeek API Key

1. 访问 [DeepSeek 官网](https://platform.deepseek.com/)
2. 注册/登录账号
3. 在 API Keys 页面创建新的 API Key

## 🚀 安装步骤

### 方式一：开发模式（推荐用于测试）

1. 克隆或下载此仓库到本地
2. 进入项目目录：
   ```bash
   cd words2anki
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 在 Raycast 中导入扩展：
   - 打开 Raycast
   - 搜索 `Import Extension`
   - 选择此项目目录

### 方式二：构建后导入

1. 构建扩展：
   ```bash
   npm run build
   ```
2. 在 Raycast 中导入 `dist` 目录

## ⚙️ 配置

首次使用时，需要在 Raycast 偏好设置中配置以下参数：

| 参数             | 说明                   | 默认值                  |
| ---------------- | ---------------------- | ----------------------- |
| DeepSeek API Key | 你的 DeepSeek API 密钥 | 必填                    |
| Anki Deck Name   | 卡片添加到的牌组名称   | `Default`               |
| AnkiConnect URL  | AnkiConnect 服务地址   | `http://localhost:8765` |
| Anki Note Type   | 笔记类型               | `Basic`                 |

## 📖 使用方法

1. **复制上下文**：
   - 在阅读时，按 `Cmd+C` 复制包含生词的整句或整段话

2. **选中生词**：
   - 选中你想要学习的生词

3. **触发 Raycast**：
   - 呼出 Raycast（默认快捷键：`Cmd+Space`）
   - 输入 `ankicard` 或 `Create Anki Card`
   - 回车执行

4. **等待完成**：
   - 脚本会自动完成以下步骤：
     - ✓ 读取剪贴板获取上下文
     - ✓ 获取选中的单词
     - ✓ 调用 DeepSeek AI 生成释义
     - ✓ 将卡片推送到 Anki
   - 成功后会显示提示信息

## 📇 卡片格式

创建的 Anki 卡片包含：

**正面（Front）**：
- 生词（大字体加粗）
- 上下文句子/段落（斜体灰色）

**背面（Back）**：
- 词性和中文释义
- 英文释义
- 上下文的中文翻译

**标签（Tags）**：
- 自动添加 `words2anki` 标签，方便管理

## 🔧 故障排除

### 无法连接到 Anki

**错误信息**：`Cannot connect to Anki`

**解决方法**：
1. 确保 Anki 正在运行
2. 确认已安装 AnkiConnect 插件
3. 检查 AnkiConnect URL 配置是否正确（默认：`http://localhost:8765`）

### DeepSeek API 错误

**错误信息**：`DeepSeek API error: 401`

**解决方法**：
1. 检查 API Key 是否正确
2. 确认 API Key 是否有效且未过期
3. 检查账户余额是否充足

### 无法获取选中文本

**错误信息**：`Failed to get selected text`

**解决方法**：
1. 确保在触发命令前已选中文本
2. 某些应用可能不支持文本选择，尝试在其他应用中使用

### 卡片添加失败

**错误信息**：`AnkiConnect error: ...`

**解决方法**：
1. 确认目标牌组（Deck）存在
2. 确认笔记类型（Note Type）存在
3. 基础笔记类型应包含 `Front` 和 `Back` 字段

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 代码检查
npm run lint

# 修复代码格式
npm run fix-lint
```

## 📄 许可证

MIT License

## 🙏 致谢

- [Raycast](https://raycast.com/) - 强大的 macOS 效率工具
- [AnkiConnect](https://foosoft.net/projects/anki-connect/) - Anki 的 API 接口
- [DeepSeek](https://www.deepseek.com/) - 高质量的 AI 语言模型
