# 测试记录

[English](TESTING.md) | **简体中文**

发布准备检查日期：2026-11-04（Asia/Shanghai）。自动检查、原生界面验收与用户实测分别记录。

## 自动验证

- `npm run check`：**152 项测试通过**，无失败或跳过；TypeScript、ESLint、Prettier、辅助 CLI 与 Raycast 发布构建（`ray build -e dist`）通过。
- 回归覆盖前台会话身份、终端/tmux 定位、Claude/Codex Hook、请求生命周期、数据库并发、通知取消与重试、历史发现、标题同步和可选全文搜索。
- 新增 Claude 在 `AskUserQuestion` 后发送通用授权提醒的回归，覆盖倒序到达、对应回答，以及独立授权/额度问题的保留。通用提醒不得重复形成待处理请求，也不得在问题已回答后残留。
- 跳转单测注入接口，不据此宣称已经打开真实目标窗口。

## 原生界面与用户实测

- Raycast 已加载四个命令；**Subscribe to Current Conversation** 可从根搜索直接运行，并单独设置全局快捷键。
- 用户确认独立命令可以订阅当前 **Codex 桌面对话**，并在 Subscriptions 按回车返回正确对话。
- 用户还确认常用终端中可以订阅当前会话，并返回原标签。尚未明确终端应用名称，因此不把这一结果扩展为所有终端均通过。
- 在原生 Raycast 中检查当前发布构建：Claude 云端行显示云朵，省略长状态说明和未知时间占位，详情仍保留监测限制。此前列表验收覆盖深浅主题和回车 / Command-Return 顺序。
- 在临时目录启动真实 Claude Code CLI 测试会话，仅开放提问工具，复用已安装的 Agent Inbox Hook 定义。启动、回合结束、结构化问题与回答通过真实 Hook CLI 和本地数据库；通过 Raycast Command-Return 订阅，并看到会话进入 Waiting for You。
- 修复生命周期后再次提问：结构化问题和通用提醒仅产生一个待处理请求；回答后回到 `ready`，待处理请求清空。验证 Command-D 可以标记测试会话为已处理，并从订阅列表移除；后续状态变化会清除已处理标记。
- 验证订阅搜索只返回匹配的测试会话。显式启用原生过滤，避免搜索回调关闭 Raycast 默认过滤。验收后已取消订阅并清理临时测试会话。

## 尚未完成的实机覆盖

- **系统通知送达与通知点击仍未验证。** 已安装 Homebrew `terminal-notifier` 3.1.0，但 `terminal-notifier -diagnose` 显示系统拒绝通知权限。用户选择暂不开启；通知队列会重试，不宣称已成功送达或点击跳转。
- Terminal、iTerm2、Ghostty 和 tmux 仍需分别注明应用的原标签/pane 验证。自动化工具禁止操作 Terminal 与 Ghostty 窗口，目前可用的实机证据为上述用户常用终端验证。
- 因此，“系统通知 → 点击 → 原窗口 → 已处理 → 可见菜单栏计数”的完整链路仍待验收。

## 商店素材

三张截图使用虚构会话、统一暗色主题与背景，尺寸为 2000 × 1250 PNG。素材由原生窗口截图加统一背景组成；本机 Raycast Capture Window 未成功导出。

提交内容直接放在 Raycast extensions 工作副本的 `extensions/agent-inbox` 目录。提交只包含扩展源码、测试、运行时素材、截图及配套文档；本地开发技能、内部调查笔记、依赖和验收生成文件均不纳入提交。仓库与支持链接指向官方公开仓库，安全报告遵循官方政策。

准备好的源码全新执行 `npm ci`、`npm run check` 和 `npm run lint`，均通过；另已通过 `npm run bundle` 核对可安装包。本地文档/图片链接、四个命令、辅助 CLI 和许可证均已检查。目前尚未在商店发布。
