# CLI

[English](cli.md) | **简体中文**

[返回 README](../README.zh-CN.md) · [状态与扩展接口](integrations.zh-CN.md)

辅助 CLI 随扩展打包，用于 Hook、后台采集和外部事件接入，没有单独发布到 npm。

从源码运行：

```sh
npm run build:cli
node assets/agent-inbox.mjs --help
```

通过 **All Sessions → Actions → Connect an Agent** 接入后，稳定路径为 `~/.sessions/bin/agent-inbox.mjs`。打开扩展命令会更新已经安装的 CLI。直接对源码路径执行 `install` 则会把那个路径写入 Hook；常规使用应从 Raycast 会话列表的接入面板操作。

## 命令

| 命令                     | 参数与默认值                                | 行为                                                                           |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------ |
| `help` / `--help` / `-h` | 无                                          | 打印帮助，不创建数据库或日志                                                   |
| `list`                   | `--json`：布尔开关，默认关闭                | 列出数据库中最近的最多 100 条会话；不扫描所有历史文件                          |
| `jump <agent> <session>` | 两个必填字符串                              | 跳回已记录会话；不存在或跳转失败时非零退出                                     |
| `event`                  | 见下表                                      | 上报外部状态事件，可能为已订阅会话入队通知                                     |
| `hook <claude\|codex>`   | stdin JSON                                  | 接收客户端 Hook；无效或不支持的载荷忽略，异常记录日志并以 0 退出               |
| `hook codex-notify`      | 最后一个参数为 JSON；可选 `--then <cmd...>` | 记录 Codex notify，并保留原通知程序的转发                                      |
| `watch`                  | `--once`：布尔开关，默认关闭                | 采集已订阅会话、同步标题并投递通知；默认循环，轮次间约 2 秒，`--once` 只跑一轮 |
| `deliver`                | 无                                          | 投递持久化队列中的有效通知                                                     |
| `install <agent...>`     | 来源 ID；`--collector` 默认关闭             | 写入 Hook 配置；可选安装 / 重启 macOS 用户级采集器                             |
| `version`                | 无                                          | 输出 `agent-inbox 1`，其中 1 是内部 CLI 协议修订号，不是发布版本               |

`watch` 收到 SIGINT / SIGTERM 后在当前轮结束时退出。采集异常写日志；单轮采集模式的退出码不能代替日志检查。`deliver` 失败的通知由队列退避重试。

无命令或未知命令退出码为 2。普通运行错误退出码为 1；Hook 模式为了不打断 Agent，在记录错误后仍返回 0。当前解析器会忽略未知参数，调用方应严格使用这里列出的选项。

## `event` 参数

| 参数                    | 类型 / 默认值                 | 说明                                                                                                                                            |
| ----------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--agent`               | 必填字符串                    | 来源 ID；不要求已有内置 Adapter，但跳回需要相应 Adapter                                                                                         |
| `--session`             | 必填字符串                    | 来源中的会话 ID                                                                                                                                 |
| `--type`                | 必填枚举                      | `started`、`progress`、`tool`、`needs_input`、`resolved`、`stopped`、`completed`、`failed`、`quota`、`interrupted`、`ended`；缺失或无效时退出 2 |
| `--attention`           | 可选枚举；默认未指定          | `input`、`question`、`permission`、`failed`、`quota`、`interrupted`；无效时退出 2                                                               |
| `--title` / `--summary` | 可选字符串；默认未指定        | 当前标题与简短说明；含空格时使用 shell 引号                                                                                                     |
| `--cwd`                 | 字符串；默认当前目录          | 所属项目路径                                                                                                                                    |
| `--host`                | `cli` / `app`；默认未指定     | 其他值按未指定处理                                                                                                                              |
| `--event-id`            | 可选字符串；默认未指定        | 稳定事件 ID，供幂等去重使用                                                                                                                     |
| `--turn`                | 可选字符串；默认未指定        | 来源中的回合 ID                                                                                                                                 |
| `--request`             | 可选字符串；默认未指定        | 逗号分隔的请求 ID；回答时使用同一 ID                                                                                                            |
| `--at`                  | 毫秒时间戳；默认 `Date.now()` | 使用来源真实发生时间。当前 CLI 对非数字或 0 使用当前时间；调用方应传入有效正数                                                                  |

缺少 agent、session 或 type 时退出 2。`stopped` 只代表本轮结束，明确完成才上报 `completed`；未解决问题不会因停止而自动消失，见 [状态契约](integrations.zh-CN.md#状态契约)。

## 不接触真实订阅的最小示例

在仓库根目录执行。此示例使用临时状态目录、关闭通知，并在结束时删除演示数据：

```sh
npm run build:cli
(
  export AGENT_INBOX_HOME="$(mktemp -d)"
  trap 'rm -rf "$AGENT_INBOX_HOME"' EXIT
  printf '%s\n' '{"notifications":false}' > "$AGENT_INBOX_HOME/config.json"
  node assets/agent-inbox.mjs event --agent demo --session demo-1 \
    --type needs_input --attention question --title "Demo session" \
    --request question-1 --event-id question-1-open
  node assets/agent-inbox.mjs list --json | node -e '
    let text = "";
    process.stdin.on("data", chunk => text += chunk);
    process.stdin.on("end", () => {
      const [session] = JSON.parse(text);
      console.log(`${session.title}: ${session.status}`);
    });
  '
)
```

输出：

```text
Demo session: needs_input
```

## 环境变量

这些路径在进程启动时读取。目录应为绝对路径；不存在或不可读的来源不会因此获得云端数据。

| 环境变量                          | 默认值                                                      | 用途                                        |
| --------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| `AGENT_INBOX_HOME`                | `~/.sessions`                                               | 配置、数据库、日志、稳定 CLI 与缓存目录     |
| `CLAUDE_CONFIG_DIR`               | `~/.claude`                                                 | Claude 配置与 CLI 会话目录                  |
| `CODEX_HOME`                      | `~/.codex`                                                  | Codex 配置、会话与目录数据库                |
| `AGENT_INBOX_CLAUDE_DESKTOP_ROOT` | `~/Library/Application Support/Claude/claude-code-sessions` | Claude 桌面 metadata 根目录                 |
| `AGENT_INBOX_SQLITE`              | 优先系统 `/usr/bin/sqlite3`，随后 Homebrew 路径 / PATH      | SQLite 可执行文件；无效路径会产生数据库错误 |

恢复终端、通知和全文搜索以 Raycast 原生偏好为准，打开命令时同步到 `config.json`；菜单栏显示由 Raycast 命令开关控制，界面与通知标签统一为英文。`config.json` 读取失败时采用默认配置；当前不对手写字段做完整 schema 校验，建议使用界面设置。默认值见 [README](../README.zh-CN.md#数据与设置)。
