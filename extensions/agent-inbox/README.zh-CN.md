<picture>
  <source media="(prefers-color-scheme: dark)" srcset="media/app-icon@dark.png">
  <img src="media/app-icon.png" width="128" height="128" alt="Agent Inbox logo">
</picture>

# Agent Inbox

订阅 Claude Code 与 Codex 会话，在需要你输入时提醒，并跳回原对话。

[![Platform: Raycast](media/raycast-platform.svg)](https://www.raycast.com/)
[![OS: macOS](media/macos-platform.svg)](https://www.apple.com/macos/)

[English](README.md) | **简体中文**

一个 macOS Raycast 扩展，适合同时处理多个 AI 编程会话的开发者。把关心的会话加入订阅列表，在 Agent 等待回答或授权时收到提醒，再回到对应的桌面对话或终端继续工作。

使用流程示意：

```mermaid
flowchart LR
    A[Claude Code / Codex] --> B[订阅关心的会话]
    B --> C[待输入提醒]
    C --> D[跳回原对话]
    D --> E[处理后继续工作]
```

- **找到会话**：搜索标题、项目和会话 ID，订阅历史会话或当前窗口对话。
- **知道谁在等你**：订阅列表和菜单栏显示状态，系统通知提醒需要处理的请求。
- **回到工作上下文**：定位桌面对话、终端标签或 tmux pane；无法精确定位时提示恢复方式。
- **按需搜索正文**：默认不建全文索引；确认开启后在本机检索用户与 Agent 的消息。

## 快速开始

需要 **macOS、Raycast**，以及已经使用的 Claude Code 或 Codex。可点击通知另需 `terminal-notifier`。

安装扩展后：

1. 在 Raycast 搜索 **Agent Inbox**，打开 **All Sessions → Actions（⌘K）→ Connect an Agent**，接入 Claude Code 或 Codex。Codex 首次需在客户端执行 `/hooks` 确认。
2. 从目标 Agent 窗口唤出 Raycast，运行 **Subscribe to Current Conversation（订阅当前对话）**。也可在 **All Sessions** 中选中会话，按 ⌘↵ 订阅。
3. 打开 **Subscriptions（订阅列表）**，查看状态并按回车跳回。支持监测的会话在产生新待处理请求时会提醒；首次恢复历史状态不补发通知。

插件界面和通知统一使用英文。通过 **Actions → Open Extension Preferences** 打开原生偏好，设置恢复终端、通知和全文搜索。

接入会安装本地 Hook 和用户级后台采集器，修改前备份已有配置。权限、可点击通知、数据位置和卸载步骤见 [安装指南](help.zh-CN.md)。

## 日常使用

| Raycast 命令                      | 用途                         | 常用操作                                                   |
| --------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Subscribe to Current Conversation | 订阅当前窗口中的对话         | 可在 Raycast Preferences → Extensions 中单独设置全局快捷键 |
| All Sessions                      | 搜索与筛选会话，订阅当前窗口 | ↵ 跳回 · ⌘↵ 订阅 · ⌘I 详情                                 |
| Subscriptions                     | 处理关心的会话               | ↵ 跳回 · ⌘↵ 取消订阅 · ⌘D 已处理                           |
| Session Menu Bar                  | 展示订阅会话与待输入数量     | 在 Raycast 原生命令偏好中启用或停用                        |

**待输入**包括问题、授权，以及需要处理的失败、额度或中断。**本轮结束**表示 Agent 停止了这一轮；只有明确的完成事件才标记为**已完成**。标记已处理会暂时隐藏会话，状态变化或新请求会让它重新出现。

完整快捷键、状态语义、标题同步和跳转兜底见 [使用指南](help.zh-CN.md)。

## 支持范围

当前支持的平台是 **Raycast**，操作系统是 **macOS**。会话状态采集依赖本地 Hook 或对话记录，纯云端会话的能力见下表。

| 来源                       | 当前能力                                       | 边界                                                           |
| -------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| Claude Code CLI / 本地桌面 | 历史发现、订阅、Hook 与本地记录状态采集、跳回  | 原窗口定位依赖权限与可用的会话映射                             |
| Codex CLI / 桌面           | 历史发现、订阅、Hook 与本地 rollout 采集、跳回 | 客户端数据格式可能变化；精确跳转需要客户端支持                 |
| Claude Code 纯云端         | 按明确窗口 ID 订阅和跳回，同步已打开窗口的标题 | 以云朵图标标识；无本地记录或 Hook 时，没有待输入提醒或正文搜索 |
| 终端                       | Terminal、iTerm2、Ghostty；支持 tmux 定位      | 精确 Ghostty 定位使用 1.4 的 tty 接口；缺少接口时降级处理      |

Agent Inbox 管理你已经打开的会话，不托管或派发任务、不代替用户授权，也不提供跨设备云同步。只有一个会话、很少切换窗口时，直接使用原客户端即可。其他 Agent 和网络通知渠道目前只有扩展接口，尚未内置接入。

## 数据与设置

状态、订阅、配置、通知队列存储在 `~/.sessions/`。会话记录只读；没有会话上传服务。

| 设置         | 类型 / 默认值                              | 行为                                                                      |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------- |
| 默认终端     | Terminal / iTerm2 / Ghostty；默认 Terminal | 找不到原 CLI 窗口时在此恢复会话                                           |
| 系统通知     | 开关；默认开启                             | 仅提醒已订阅、未处理且仍需用户介入的会话                                  |
| 菜单栏显示   | Raycast 原生命令启用开关                   | 展示订阅会话与待输入数量                                                  |
| 会话全文搜索 | 开关；默认关闭                             | 在偏好设置中启用后，在本机索引用户与 Agent 消息；不包含工具输出与思考过程 |

修改原生偏好后，重新打开扩展命令以同步后台采集器配置。

全文索引位于 `~/.sessions/cache/conversation-search.sqlite`。关闭搜索会停止索引与正文检索，已有索引不会自动删除。更多说明见 [搜索与隐私](help.zh-CN.md#搜索)。

问题和建议请提交到 [Issues](https://github.com/0xFANGO/agent-inbox/issues)。

平台图标来自 [Simple Icons](https://github.com/simple-icons/simple-icons)，使用 [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) 许可。商标归各自所有者所有。
