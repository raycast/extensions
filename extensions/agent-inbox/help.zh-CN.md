# Agent Inbox 使用帮助

[English](help.md) | **简体中文**

[README](README.zh-CN.md)

## 环境要求

- macOS、Raycast，以及已经使用的 Claude Code 或 Codex。Agent Inbox 不安装或登录这些客户端。
- 系统自带的 `sqlite3`，用于本地状态与搜索索引。
- 可选的 `terminal-notifier`，用于可点击通知。

Hook 和后台采集器优先使用已有 Node.js，没有时使用 Raycast 自带运行时。

### 接入第一个 Agent

1. 打开 **All Sessions**，在 **Actions（⌘K）** 中选择 **Connect an Agent**。
2. 选择 Claude Code 或 Codex，按回车执行接入；面板会显示结果。
3. Codex 首次接入后，按提示在 Codex 内执行 `/hooks` 确认信任。已运行会话是否加载新 Hook 取决于客户端，可在新会话中验证。
4. 在 **All Sessions** 选中会话后按 ⌘↵ 订阅；也可从目标 Agent 窗口唤出 Raycast，直接运行 **Subscribe to Current Conversation**。列表中的 Actions → Subscribe to Current Conversation（⌘⇧↵）仍可使用。
5. 打开 **Subscriptions（订阅列表）** 查看它。支持监测的会话在需要回答或授权时进入「待输入」，系统通知开启时会提醒；按回车跳回原对话。

首次可以订阅一个已经存在的会话验证列表展示。通知应使用新产生的问题或授权请求验证：首次恢复历史状态不会补发历史通知。

### 权限与可点击通知

窗口识别和终端定位需要 macOS 的「辅助功能」或「自动化」权限。根据系统提示，在「系统设置 → 隐私与安全性」中给执行操作的 Raycast / 终端授权。没有可靠的窗口信息时，在「全部会话」中手动选择会话。

如需点击系统通知后跳回，可使用 Homebrew 安装：

```sh
brew install terminal-notifier
```

没有它时仍可显示系统通知，但不能从通知直接跳回。点击通知后，Raycast 会先确认，再跳转；订阅列表内按回车直接跳转。macOS 通知权限和专注模式也会影响通知显示。

## 安装会修改什么

| 位置                                                           | 用途                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `~/.claude/settings.json`                                      | Claude Code Hook 配置；使用 `CLAUDE_CONFIG_DIR` 时跟随该目录  |
| `~/.codex/config.toml`、`~/.codex/hooks.json`                  | Codex notify 转发与 Hook 配置；使用 `CODEX_HOME` 时跟随该目录 |
| `~/.sessions/bin/agent-inbox.mjs`                              | Hook 与采集器使用的稳定 CLI 路径                              |
| `~/Library/LaunchAgents/com.fango.agent-inbox.collector.plist` | 用户级后台采集服务                                            |
| `~/.sessions/`                                                 | 状态、订阅、配置、通知队列与缓存                              |

接入会保留其他 Hook 和原有 Codex notify 转发；修改已有配置前写入同路径的 `*.agent-inbox.bak`。备份为最近一次修改前的内容，多次接入可能覆盖旧备份。接入面板也会安装或重启后台采集器。更新扩展后，下次打开命令会同步已经安装的 CLI。

Agent 自身的对话文件只读。默认搜索标题、项目和 ID；全文搜索需要在 Raycast 原生偏好中主动开启，索引留在本机，关闭后不会自动删除已有索引。详细行为见 [使用指南](#搜索)。

## 停用或卸载

临时停止某个会话的后台采集与提醒：在列表中取消订阅。只停止系统提醒：在原生偏好中关闭 **System Notifications**，再打开扩展命令同步后台配置。

完整卸载按以下顺序操作：

1. 在 **All Sessions → Actions → Connect an Agent**选择已接入的 Agent，在 Actions 中执行**Remove Hooks**。对每个接入的 Agent 分别操作；只移除本扩展条目，不要直接用旧备份覆盖整份客户端配置。
2. 停止后台采集器，并删除它的启动项：

   ```sh
   launchctl bootout "gui/$(id -u)/com.fango.agent-inbox.collector"
   rm -f "$HOME/Library/LaunchAgents/com.fango.agent-inbox.collector.plist"
   ```

   若服务已停止，第一条命令可能报告找不到服务；仍需删除启动项，避免下次登录再次启动。仅移除 Hook 不会自动卸载采集器。

3. 在 Raycast 的扩展设置中移除 Agent Inbox。
4. 在 **All Sessions** 选中会话后按 ⌘↵ 订阅；也可从目标 Agent 窗口唤出 Raycast，直接运行 **Subscribe to Current Conversation**。列表中的 Actions → Subscribe to Current Conversation（⌘⇧↵）仍可使用。

## 排查

| 现象               | 检查                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| 无法订阅当前窗口   | 目标是否是受支持的 Code 页面；窗口权限与 tty 是否可读；先在全部会话里手动订阅 |
| 纯云端会话没有提醒 | 没有本地记录或 Hook 时不具备状态监测，详情会显示「云端状态未接入」            |
| 会话未进入已完成   | 普通回合停止只代表「本轮结束」；仅明确的完成事件进入已完成                    |
| 没有系统通知       | 检查订阅、已处理标记、通知开关与 macOS 权限；历史状态恢复不会补发提醒         |
| 通知不能点击       | 检查 `terminal-notifier` 是否可用；仍可在订阅列表跳回                         |
| 跳转只打开了应用   | 未能精确定位时会复制 ID 或恢复 CLI，会话详情与提示会说明兜底结果              |

诊断日志位于 `~/.sessions/log.txt` 和 `~/.sessions/collector.log`。提交问题前删去路径、会话内容和凭据，见 [贡献说明](https://github.com/0xFANGO/agent-inbox/issues)。

## 命令

| 命令                                  | 作用                             | 快捷键                                                      |
| ------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| **Subscribe to Current Conversation** | 直接订阅当前窗口对话             | 在 Raycast Preferences → Extensions 中单独设置全局快捷键    |
| **All Sessions（全部会话）**          | 浏览会话、筛选状态与订阅当前窗口 | ↵ 跳转 · ⌘↵ 订阅／取消订阅 · ⌘I 详情 · ⌘R 刷新              |
| **Subscriptions（订阅列表）**         | 仅显示已订阅且未处理的会话       | ↵ 跳转 · ⌘↵ 取消订阅 · ⌘D 已处理 · ⌘I 详情 · ⌘⇧D 归档已完成 |
| **Session Menu Bar**                  | 展示订阅会话与待输入计数         | 在 Raycast 原生命令偏好中启用或停用                         |

插件界面与通知标签统一使用英文。下文的中文名称用于解释对应功能。

「全部会话」中的「已订阅」与状态筛选可重叠。「订阅列表」按待输入、已订阅、已完成三个互斥分区展示；运行中、本轮结束和状态尚未确认的订阅会话归入「已订阅」，运行状态仍用蓝灯表示。「已完成」只包含明确完成的会话，不再有「其他会话」分区。

两个会话列表统一使用 **↵ 跳转、⌘↵ 订阅／取消订阅**。底栏显示 Jump to Session；打开 Actions（⌘K）可看到两个快捷键。订阅后列表保持打开。**Subscribe to Current Conversation（订阅当前对话）** 是独立命令，可直接搜索或配置全局快捷键；All Sessions 的 Actions 和 **⌘⇧↵** 入口继续保留。接入 Agent 和打开偏好设置的入口仍在 Actions 中。

列表优先显示标题、项目、运行位置和活动时间，按 **⌘I** 查看最新消息及完整状态；全文搜索结果保留命中片段。订阅分区标题显示会话数量，打开详情侧栏时精简行内重复标签，为标题留出空间。

返回上一级可按 Mac 的 **⌫ Delete**：搜索框为空时返回，有内容时先删字；Esc 仍遵循 Raycast 自身设置。接入面板通过原生导航栈返回。

### 搜索

默认只搜索会话标题、项目与会话 ID，**不自动加载或索引完整对话**。选择搜索结果底部的 **Set Up Full-Text Search** 或操作菜单中的 **Open Extension Preferences**，在原生偏好中主动开启 **Full-Text Search**，然后重新打开 All Sessions。偏好说明会告知读取范围和本地索引行为。关闭后停止索引和正文检索，已有索引留在本机且不再更新。

启用后可检索完整的用户与 Agent 消息，支持中文短词、大小写归一和多个关键词；工具输出、思考过程和系统注入内容不纳入正文索引。首次流式读取本机记录，随后仅重新索引修改时间或大小变化的文件。查询使用本地 SQLite 索引，不逐次扫描原文件，也不会上传对话。索引过程中标题搜索仍可用；刷新列表会排队处理最新数据，不会中断正在运行的索引；离开列表或关闭全文搜索时才取消读取。

### 偏好设置与接入

通过 **Actions → Open Extension Preferences** 打开 Raycast 原生偏好：

- **Default Terminal（默认终端）**：Terminal / iTerm2 / Ghostty；优先定位原窗口，失败后才在所选终端执行 `claude --resume <id>` 或 `codex resume <id>`。
- **System Notifications（系统通知）**：默认开启。仅提醒已订阅且尚未处理的请求；已处理、退订、已回答或关闭通知时取消尚未投递的提醒。修改后重新打开扩展命令，同步后台采集器配置。
- **Full-Text Search（全文搜索）**：默认关闭。主动开启后才建立本地正文索引；关闭不会删除已有索引。

菜单栏通过 Raycast 原生的 **Session Menu Bar** 命令启用开关控制，刷新周期为一分钟，插件内不再提供第二个显示开关。

**Connect an Agent（接入 Agent）** 保留在会话列表的操作菜单中。选择 Claude Code / Codex 后执行接入，显示进度与成功／失败；原配置备份为 `*.agent-inbox.bak`。Codex 首次仍需在应用内执行 `/hooks` 确认。

## 状态与订阅

- **运行中**：Agent 正在执行；**待输入**：有待回答、待授权或失败/额度/中断需要处理。
- **本轮结束**：这一轮已停止，可以继续输入。`Stop`、`agent-turn-complete`、`end_turn` 都不会直接标成任务已完成。
- **已完成**：只接受来源明确上报的 `completed`。旧版本由 Claude/Codex 停止事件推断的已完成记录，会迁移为本轮结束，保留订阅和已处理标记。
- **状态未确认**：执行期间进程退出，但没有可靠的正常结束证据。不会按超时猜成已完成。
- 结构化问题/授权按请求 ID 保存；停止、其他工具活动或新回合不会清除它。只有对应回复、请求取消/结束的解析事件才解除。Codex 桌面异步提问的 `accepted: true` 只代表已发出问题；多问题逐项等待真正回复。
- 自然语言请求（例如“请确认后继续”“请选择”）只是备用提示，不用来证明任务完成；新用户输入会清除这类提示。
- **订阅**：进入订阅列表，待处理时提醒。**取消订阅**：停止采集和提醒，仍可在全部会话中找到。
- **已处理（⌘D）**：暂时离开订阅列表；状态变化或新的待处理请求会恢复显示。重新订阅也会恢复。
- 订阅列表约 2 秒刷新，全部会话约 5 秒刷新；Raycast 菜单栏遵循宿主的 1 分钟刷新周期。

接入时安装用户级后台采集服务 `com.fango.agent-inbox.collector`：只处理已订阅会话。首次分块读取其本地 transcript 恢复未回答请求，不建立全文搜索索引、不补发历史通知；随后保存读取位置并增量采集。单次读取最多 1 MB，超大单行跳过，不加载整份大文件进内存。缺失、未写完整或不支持的记录不能作为完成证据。纯云端、无本地 transcript 且未发 Hook 的会话仍无法可靠监测。

列表的临时状态恢复使用相同来源解析器和状态机，只读末尾最多 96 KB；已有结构化待处理请求不会被不完整的尾部样本清除。后台采集负责完整的订阅状态恢复。两者都不会改写 Agent 自身的对话文件。

### 标题同步

标题按会话 ID 同步，独立于运行状态。后台持续更新已订阅会话；打开列表时也会刷新其中的会话标题。订阅列表约 2 秒、全部会话约 5 秒刷新，菜单栏遵循 Raycast 的约 1 分钟周期。

- **Claude 本地桌面端**：读取桌面会话 metadata 中的当前名称。
- **Claude CLI**：优先读取会话旁的 `custom-title.json`；旧版从 transcript 中增量提取 `custom-title` / `ai-title`。旧记录首次恢复采用有界分块，可能需要多个刷新周期；有明确自定义名称时不会被生成标题覆盖。
- **Codex CLI / 桌面端**：读取本地会话目录的当前名称，兼容 `state*.sqlite` 与旧版 `session_index.jsonl`。
- **Claude Cloud**：被动读取 Claude 已打开窗口的外层文档 ID 和标题，不激活或切换窗口、不遍历对话内容。只有 ID 精确匹配的会话才更新；未打开的纯云端会话要等客户端展示后才能同步。窗口不可访问或来源暂时缺失时保留最后确认的名称。

新名称单独持久化，较旧的读取结果不能覆盖较新的结果；改名不会改变订阅、已处理、运行状态和最近活动时间，也不会触发新通知。已排队的通知在发送时使用最新名称。云端标题同步不代表云端运行状态已接入。

### 订阅当前窗口对话

独立命令与 All Sessions 操作均会显示配置和订阅失败的具体原因。配置无法保存时，Raycast 保持打开，不创建订阅。

从目标 Agent 窗口唤出 Raycast，直接运行 **Subscribe to Current Conversation**，也可在 **Raycast Preferences → Extensions** 中为它单独设置全局快捷键。All Sessions 的 Actions 和 **⌘⇧↵** 继续复用同一逻辑。插件关闭 Raycast 后识别前台窗口，再读取会话，按以下信息匹配：

- **Claude / Codex 桌面端**：优先通过原生 Accessibility 读取前台窗口文档 URL 中的会话 ID。URL 不能标识会话时使用当前文档的唯一标题；原生读取失败时才降级到 System Events。只有唯一匹配才订阅；Claude 的标题匹配仅接受以 `- Claude Code` 结尾的页面。普通 Claude 聊天、主页、标题有歧义或缺少窗口信息时，不会按最近活动时间猜一个会话。
- **Terminal / iTerm2 / Ghostty 1.4**：读取选中标签页或焦点分屏的 tty。tmux 会同时匹配前台客户端 tty、服务器 socket 和 pane，避免订阅后台的其他会话。没有可靠 tty 或出现多个匹配时会提示无法识别。

Codex 额外保留原生窗口标题，避免 Electron 的通用页面标题覆盖实际会话名；支持外部 thread 链接以及本地、独立窗口和 hash 会话路由。按实际表结构读取本地 `state*.sqlite` 的会话名称，不固定数据库版本；不支持时退到 `session_index.jsonl`。实际窗口匹配成功后才纠正旧记录的 CLI/App 来源，同时保留 Hook 的实时状态。关闭 Raycast 后会短暂等待焦点恢复，不按最近活动时间猜测。

Claude 的本地 metadata 还用于把 `bridgeSessionIds` 关联到 `local_*` 和 CLI 会话 ID；兼容旧版字符串与新版数组，`session_*` / `cse_*` 的同后缀 ID 按同一映射处理。多个本地记录指向同一 ID 时拒绝匹配。纯云端 Code 页面没有本地记录时，也可按当前窗口的明确 `session_*` / `cse_*` ID 订阅并跳回；列表和菜单栏用云朵图标标识，详情说明目前没有待输入提醒。列表省略未知活动时间，不会用订阅时间冒充会话活动，也不会推断为运行中或已完成。

CLI 的「订阅当前窗口对话」需要先接入 Hook，并由 Hook 采集原会话的 tty / tmux 定位信息。仅扫描到的历史文件通常不含这些信息，可在「全部会话」中手动选择并订阅。

## 跳回

| 来源          | 跳回方式                                                                                                           | 兜底                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Claude 桌面端 | 将 CLI transcript ID 映射到桌面端 `local_*` ID，再打开 `claude://code/continue?session=<local_id>`                 | 打开 Claude 并复制会话 ID，提示需要手动定位 |
| Claude CLI    | 聚焦 tmux pane，或按 tty 匹配 Terminal / iTerm2 标签页、Ghostty 1.4 的终端分屏；旧版或不支持脚本的终端只能激活应用 | 在所选终端执行 `claude --resume <id>`       |
| Codex CLI     | 同上                                                                                                               | 新开终端执行 `codex resume <id>`            |
| Codex 桌面端  | `codex://threads/<threadId>`（有 `hostId` 时一并带上）                                                             | `codex://launch` 并把 ID 复制到剪贴板       |

Claude 桌面端的 `local_*` ID 和 CLI transcript UUID 不同，不能直接把 CLI UUID 放进桌面端的 continue 链接。本机已验证映射后能跳回对应的 Claude Code 对话。仅激活应用或复制 ID 是兜底行为，不代表已精确到达目标会话。

点通知会打开 `raycast://…/inbox?context=…`，Raycast 先弹窗确认（↵ 跳回，esc 取消）。在订阅列表里按 ↵ 直接跳，不弹确认。点通知跳回需要先装 `terminal-notifier`（`brew install terminal-notifier`），没装的话通知只能看、不能点。

终端定位会校验 Agent 进程身份。重新连接 hooks 后，请触发新事件或启动新会话，以更新旧的终端定位信息。
