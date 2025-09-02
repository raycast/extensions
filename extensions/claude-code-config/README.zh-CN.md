# Claude Code 配置选择器

一款用于管理 Claude Code API 配置的 Raycast 扩展程序。通过原生 Raycast 界面轻松切换不同的 Claude Code 环境（DeepSeek、Kimi）。

**语言：** [English](README.md) | [中文](README.zh-CN.md)

## 功能特性

- 🚀 **原生 Raycast 界面**：完整的列表视图，支持 ActionPanel
- 🎯 **可视化状态指示器**：查看当前激活的配置
- ⚡ **快速切换**：一键更改配置
- 📋 **复制操作**：快速复制 URL 和模型名称
- 🔄 **Shell 集成**：更新您的 `~/.zshrc` 环境变量

## 自定义配置

您可以通过扩展程序首选项配置自定义的 Claude Code 配置。扩展程序使用单个 JSON 字段，您可以定义任意数量的配置：

1. 打开 Raycast 首选项 → 扩展程序 → Claude Code 配置选择器
2. 在 "Claude Code 配置" 字段中，输入 JSON 格式的配置对象数组
3. 每个配置应包含所有必需字段：

配置示例：
```json
[
  {
    "alias": "自定义环境",
    "emoji": "⭐",
    "ANTHROPIC_BASE_URL": "https://api.example.com",
    "ANTHROPIC_AUTH_TOKEN": "your_token_here",
    "ANTHROPIC_MODEL": "claude-3-opus-20240229",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-3-haiku-20240307"
  },
  {
    "alias": "测试环境",
    "emoji": "🧪",
    "ANTHROPIC_BASE_URL": "https://api.testing.example.com",
    "ANTHROPIC_AUTH_TOKEN": "your_testing_token",
    "ANTHROPIC_MODEL": "claude-3-sonnet-20240229",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-3-haiku-20240307"
  }
]
```

如果未指定自定义配置，扩展程序将提供合理的默认配置。

## 使用方法

1. 打开 Raycast 并搜索 "Claude Code Config Selector"
2. 浏览配置列表
3. 使用 `↩` 选择配置
4. 使用 `⌘B` 复制基础 URL
5. 使用 `⌘M` 复制模型名称
6. 使用 `⌘T` 复制令牌
7. 使用 `⌘S` 复制源命令
8. 使用 `⌘R` 重新加载 shell（当配置激活时）

## 环境变量

扩展程序在 `~/.claude-code-env`和 `~/.claude-code-apply` 创建专用环境文件，而不是直接修改您的 shell 配置。这样更安全，并且让您拥有更多控制权。

### 自动配置加载（推荐）
将这些行添加到您的 `~/.zshrc` 中，以在启动新的 shell 会话时自动加载配置：
```bash
if [[ -z "$CLAUDE_CODE_SOURCED" ]]; then
  export CLAUDE_CODE_SOURCED=1
  [ -f ~/.claude-code-apply ] && source ~/.claude-code-apply
fi
```

### 手动使用
如果您更喜欢手动控制，可以根据需要应用配置：

```bash
source ~/.claude-code-env
```

或使用便利脚本：
```bash
source ~/.claude-code-apply
```

环境文件包含：
```bash
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
export ANTHROPIC_AUTH_TOKEN="your_token_here"
export ANTHROPIC_MODEL="claude-3-opus-20240229"
export ANTHROPIC_SMALL_FAST_MODEL="claude-3-haiku-20240307"
```

## 开发

要修改扩展程序：

1. 编辑 `src/utils.ts` 以更改配置选项
2. 编辑 `src/index.tsx` 以修改界面
3. 运行 `npm run dev` 测试更改
4. 运行 `npm run build` 构建生产版本

## 许可证

MIT 许可证 - 欢迎自由修改和分发。
