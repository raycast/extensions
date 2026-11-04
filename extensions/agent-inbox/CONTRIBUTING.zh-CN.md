# 参与贡献

[English](CONTRIBUTING.md) | **简体中文**

Agent Inbox 关注已有 Agent 会话的发现、订阅、状态、提醒和跳回。新来源或新通知渠道请先用 Issue 说明使用场景与数据来源，再实现对应接口。项目当前的兼容边界见 [中文版 README](README.zh-CN.md#支持范围)。

## 开发环境

需要 macOS、Raycast、Node.js 22.22.2 或更高版本，以及系统 `sqlite3`。使用 nvm 时先运行 `nvm install`；仓库使用 Node 24。

```sh
npm ci
npm run check
npm run dev
```

`npm run check` 运行测试、TypeScript、ESLint / Prettier 与 CLI / Raycast 构建。`npm run dev` 将本地扩展加载到 Raycast，适合界面验收。接入 Agent 是单独操作，会修改 Hook 配置并安装后台采集器，见 [安装说明](docs/setup.zh-CN.md)。

测试使用临时数据库与配置，不安装真实 Hook，不向 Agent 发送消息。真实窗口、通知点击、权限和终端跳转仍需手动验收；请把自动化结果与实机结果分开记录。

## 修改与验证

- 使用现有 TypeScript、ESLint 与 Prettier 配置，避免无关格式变更。
- 修改状态识别或跳转逻辑时，提供可复现的输入样本和回归测试。样本应使用虚构的会话 ID、路径与对话内容。
- 不按最近活动时间猜测目标会话，不用超时或普通回合结束推断任务完成。
- 修改用户行为时同步更新 [使用指南](docs/usage.zh-CN.md) 与 [CHANGELOG](CHANGELOG.zh-CN.md)。
- `README.md` 是默认英文说明，`README.zh-CN.md` 是对应中文版。首页相关文档同样使用默认英文与 `.zh-CN.md` 中文版；修改功能、安装步骤或支持范围时同步两种语言并保留切换链接。插件界面统一英文。
- `assets/agent-inbox.mjs` 为受版本控制的生成文件；修改核心或 CLI 后运行 `npm run build:cli`，不要手改 bundle。
- 新来源、状态契约和通知渠道的扩展方式见 [接口说明](docs/integrations.zh-CN.md)。

## 报告问题

使用 [Issues](https://github.com/raycast/extensions/issues) 提交使用问题、Bug 或功能建议。请附上：

1. 当前 commit 或发布版本、macOS / Raycast / Agent 客户端版本。
2. 会话来源：Claude / Codex、CLI / 桌面 / 纯云端、终端或 tmux 环境。
3. 最短复现步骤、预期与实际行为。
4. 必要的脱敏截图或日志片段。不要提交整份 transcript、数据库、配置或真实凭据。

漏洞报告见 [安全说明](SECURITY.zh-CN.md)。

## Pull Request

描述具体问题、修改后的行为、执行的验证与尚未验证的场景。一次 PR 尽量解决一个问题；注明关联 Issue。若条件允许，启用 “Allow edits from maintainers”，便于补充小修改。

发布前还需运行 `npm run lint` 检查 Raycast 清单、图标和 Store 作者账号；该命令需要联网，不能用它替代本地代码检查。
