# 架构

[English](architecture.md) | **简体中文**

[返回 README](../README.zh-CN.md) · [CLI](cli.zh-CN.md)

```text
来源插件（Hook / transcript / 自定义事件）
                   ↓
       EventEngine → 状态机 → SQLite
                                ├─ Raycast 列表 / 菜单栏
                                └─ 持久化通知队列 → 通知渠道插件
                                                      └─ macOS（已实现）
```

- **采集来源**：`src/core/adapters/` 声明接入、解析、跳回；可选 `source` 能力包括 transcript 解析、历史发现及定位。`src/core/sources/` 管理分块读取与持久化位置，向 EventEngine 统一上报事件。
- **Claude Code**：接入会话开始、用户输入、工具调用前后、权限请求、工具失败、通知、回合停止、StopFailure、会话退出。仅观察，不代用户批准。
- **Codex CLI / 桌面端**：结构化 Hook 配合本地 rollout。保留原有 notify 的 `--then` 转发。支持同步/异步用户问题、真正回复、回合开始/结束/中断。Hook 安装范围依据本机 0.163.0 的可用事件；Codex 自身的 Hook 信任仍由其应用管理。
- **自定义来源**：JSON manifest 只定义跳回，来源通过 CLI `event` 或 `EventEngine.ingest` 上报。DeepSeek Harness 后续应接宿主的回合、审批、提问/回答事件。完整历史发现/搜索/前台识别仍需分别实现，不能仅靠一个 JSON 自动获得。
- **核心**：统一事件包含来源、事件 ID、回合 ID、请求 ID。SQLite 使用版本比较重试避免并发 Hook 丢失更新；状态、去重记录与通知队列在同一事务内写入。订阅/已处理操作也参与版本控制。
- **通知**：`src/core/notifications/` 定义渠道无关消息与 `NotificationChannel.send`。目前仅实现 macOS；Raycast 跳回链接封装在该渠道。飞书/其他网络渠道可独立添加，不修改 Agent parser 或状态机。队列支持租约、超时、退避重试和稳定通知 ID；崩溃恢复是至少一次投递，网络渠道应使用 ID 去重。
- **后台服务**：独立 CLI 每约 2 秒采集订阅状态并投递通知；Hook 只写入状态/队列，并启动独立投递进程。网络发送不占用 Hook 的等待时间。
- **偏好**：通知、恢复终端和可选全文搜索使用 Raycast 原生偏好，命令打开时同步到 CLI 配置；菜单栏由 Raycast 原生命令开关控制。界面与通知标签统一英文。
- **数据**：数据库和队列在 `~/.sessions/db.sqlite`；Hook 错误在 `~/.sessions/log.txt`；历史发现缓存与用户主动开启的全文索引仍在 `~/.sessions/cache`。

接口、接入示例与兼容边界见 [扩展接口](integrations.zh-CN.md)。
