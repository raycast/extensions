# 来源与通知渠道接口

[English](integrations.md) | **简体中文**

## 状态契约

`Session.status` 为 running / needs_input / ready / done / idle / unknown。执行阶段保存在 `Session.state.phase`，未解决请求保存在 `pending`；只要 pending 非空，展示状态就是 needs_input，即使执行阶段已 ready。

- progress：用户开始/恢复执行，清除文本推断的提示；保留有 ID 的结构化请求。
- needs_input：加入 `requestIds` 指定的问题或授权；`attention` 说明原因。没有 ID 时只能作为可被新用户输入清除的备用提示。
- resolved：对应请求已回答、取消或关闭，提供同一 request ID；不会清除其他请求。
- tool：工具活动；只有携带匹配 request ID 才清除该请求。
- stopped：回合结束，进入 ready；不声称任务目标完成，不清除 pending。
- completed：来源明确保证任务完成；仍不覆盖未解决请求。
- failed / quota / interrupted：等待用户处理。
- ended：进程退出，运行中会变为 unknown；保留待处理请求。
- snapshot：内部恢复事件，不对 CLI 开放。

来源应提供稳定 `eventId`、`turnId`、真实发生时间 `at`（毫秒），请求 ID 应在会话内唯一。核心拒绝较旧的阶段变更；有身份的请求/回复允许迟到，以协调 Hook 与日志到达顺序，并保留已回答 ID 防止重新打开。不要用处理时间伪装历史事件时间。

## 新来源，例如 DeepSeek Harness

在 `src/core/adapters/types.ts` 的 Adapter 中实现 detect / planInstall / planUninstall / parseHook / jump，并在注册表加入。可选 `source` 声明：

- `transcript.parse(entry, session, context)`：把一条来源记录转成零个或多个 AgentEvent。
- `locateTranscript(session)`：精确定位该会话的本地记录；不能猜最近文件。
- `discover()`：预留历史发现能力；当前历史列表仍有 Claude/Codex 专用扫描，接入新来源时需要将其发现结果接到列表入口。
- `titles(sessions)`：返回按 agent / sessionId 标识的 `SessionTitle[]`，包含 title、source 和读取开始时的 observedAt；独立于状态事件。只返回有当前证据的名称，缺失、读取失败和空标题不用于清空旧名称。

`TitleSynchronizer` 合并各来源，将已有会话的名称写入独立 `session_titles` 表，再向列表提供相同的已提交名称。观察时间较旧或相同的更新不会覆盖已保存结果；不修改会话活动时间、状态、订阅、处理标记或事件收据，也不入通知队列。历史列表中尚未入库的会话仅更新当前显示，不自动导入或订阅。批量写入分块限制 SQLite 查询深度；来源按自身 agent 隔离。通知渠道发送前会取得最新标题。

来源不导入通知实现。实际组合为 `new TranscriptCollector(engine, () => adapters)`；Hook 和自定义桥接使用同一个 `EventEngine.ingest`。推送型宿主无需 transcript，可直接通过 CLI 上报：

```sh
node ~/.sessions/bin/agent-inbox.mjs event --agent dsh --session session-1 \
  --type needs_input --attention permission --request approval-7 \
  --turn turn-3 --event-id approval-7-open --at 1793772000000
node ~/.sessions/bin/agent-inbox.mjs event --agent dsh --session session-1 \
  --type resolved --request approval-7 --event-id approval-7-closed --at 1793772010000
```

JSON manifest 仍只描述跳回 URL/恢复命令，不执行任意插件代码，也不自动采集状态。本轮未安装 DSH 桥接或修改其插件配置。

## 新通知渠道，例如飞书

实现 `src/core/notifications/types.ts` 中的 `NotificationChannel`：

```ts
const channel: NotificationChannel = {
  id: "feishu",
  async send(message, { config, signal }) {
    // 使用 message.id 作为幂等键；请求遵守 signal，失败时 throw。
    // message 仅含 agent/sessionId、标题、摘要、attention、时间。
  },
};
await deliverNotifications(store, config, [macosChannel(), channel]);
```

将实现接入 CLI 的投递组合入口，并在配置 `notificationChannels` 中启用其 ID。默认 `["macos"]`；全局 notifications=false 关闭全部渠道。配置一个尚未注册的渠道不会自动发送，它会留在队列中退避重试。

EventEngine 只依据启用渠道写入队列，不调用网络。更新状态、事件去重与入队为同一事务；独立投递器在发送前再次检查订阅、已处理、问题是否仍未解决及全局通知设置。单次发送有 10 秒上限；失败按指数退避重试，最长间隔 1 小时。

队列提供至少一次投递，不保证任意外部服务严格恰好一次。渠道须按稳定 message.id 实现可用的去重；凭据配置留在该渠道，不能放进 AgentEvent 或通知内容。本轮没有实现飞书网络发送，也没有向飞书发消息。

## 运行与验收

通过 **Connect an Agent** 接入时会安装/重启用户级 LaunchAgent `com.fango.agent-inbox.collector`。它只读取已订阅的本地会话：首次分块恢复历史，不补发历史通知；之后增量读取。多兆工具输出以有界内存跳过，未闭合 JSON 等待下一次读取。原 Agent 文件只读。

`watch --once` 可对当前订阅做一轮采集/投递；排查时应使用临时 AGENT_INBOX_HOME 与 notifications=false，避免改变真实订阅或发出通知。独立服务可用 `launchctl bootout gui/$(id -u)/com.fango.agent-inbox.collector` 停止；保留 plist 会在后续登录或重新接入时恢复。

当前来源适配基于本机 Codex CLI 0.163.0 的 Hook 能力、真实本地日志结构和 Claude Code 记录。源码测试覆盖同步/异步问题、分项回答、重复/乱序/并发事件、迁移、文件部分写入/轮转、大文件恢复和通知重试。云端无本地数据、版本改变的数据协议以及原生通知点击仍需要对应版本的实机验证。
