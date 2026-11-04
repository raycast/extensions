# 安全说明

[English](SECURITY.md) | **简体中文**

本扩展读取本机 Agent 的会话记录与窗口信息，并维护本地数据库、缓存和通知。请勿在公开 Issue、PR 或截图中提交真实凭据、完整对话、数据库或未经脱敏的配置。

## 报告漏洞

请遵循 [Raycast extensions 安全政策](https://github.com/raycast/extensions/blob/main/SECURITY.md)，私密发送至 **security@raycast.com**，邮件主题为 **[Extension Security] Agent Inbox**。请提供受影响版本、复现条件、影响和脱敏样本，不要在公开 Issue 或 PR 中披露漏洞细节。

## 验证时隔离数据

调试状态机与 CLI 时使用临时 `AGENT_INBOX_HOME`，并设定 `notifications: false`。示例见 [CLI 文档](docs/cli.zh-CN.md)。不要用真实会话验证自动授权或发送消息；本项目不提供代用户批准 Agent 请求的能力。

当前没有已发布的 GitHub Release 或长期支持版本线。报告中请给出 commit，修复后的支持范围以发布说明为准。
