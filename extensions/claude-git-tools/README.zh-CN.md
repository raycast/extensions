[English](README.md) | [中文](README.zh-CN.md)

# Claude Git Tools

基于 Claude Code CLI 的 Raycast 扩展，用于 git 自动化。在后台启动 Claude 进程执行 git-push、create-pr、review-pr，将格式化输出流式回传到 Raycast。

## 环境要求

| 依赖 | 必需 | 说明 |
|------|------|------|
| [Raycast](https://raycast.com) | 是 | 承载扩展运行 |
| [Node.js](https://nodejs.org) + npm | 是 | 构建扩展 |
| `git` | 是 | 版本控制 |
| [`claude`](https://docs.anthropic.com/en/docs/claude-code) | 是 | Claude Code CLI，需支持 `--output-format stream-json` |
| [`gh`](https://cli.github.com) | 推荐 | Create PR 和 Review PR 命令依赖此工具 |
| [`terminal-notifier`](https://github.com/julienXX/terminal-notifier) | 可选 | 任务完成时发送 macOS 通知，支持点击跳转 PR/commit 链接 |

所有 CLI 工具需在 PATH 中可用。

## 使用指南

### 1. 安装

```bash
cd extensions/claude-git-tools
npm install
npm run dev
```

### 2. 配置目录与 Skill

在 Raycast 中运行 **Manage Folders & Skills**：

- **Folders**：添加包含 git 仓库的父目录（如 `~/git`），扩展向下扫描最多 3 层寻找 `.git`
- **Skills**：可选为每个命令（Git Push / Create PR / Review PR）绑定 `.md` skill 文件作为系统提示词。未配置时回退到内置 slash 命令（`/git-push-changes`、`/create-pr`、`/pr-review`）

### 3. 执行命令

| 命令 | 流程 |
|------|------|
| **Git Push** | 选择仓库 → 任务详情面板（Claude 暂存、提交、推送） |
| **Create PR** | 选择仓库 → 输入或选择目标分支 → 任务详情面板（Claude 创建 PR） |
| **Review PR** | 选择仓库 → PR 列表 → 选择 PR → 任务详情面板（Claude 审查） |

任务以分离的后台进程运行，任务详情面板实时流式展示输出。关闭 Raycast 窗口不会中断运行中的任务。

### 4. 查看任务 / 切换模型

- **View Tasks** — 查看所有运行中和已完成的任务，点击查看输出和提取的 URL
- **Manage Model** — 切换 Haiku / Sonnet / Opus

## Claude CLI 权限

扩展通过 `--allowedTools` 参数调用 `claude`，仅预授权特定工具，避免后台进程中出现交互式权限确认。

| 工具 | 用途 |
|------|------|
| `Bash(git:*)` | 所有 git 操作 — add、commit、push、diff、log、branch、merge、rebase 等 |
| `Bash(gh:*)` | GitHub CLI — `gh pr create`、`gh pr list`、`gh pr merge`、`gh pr close` 等 |
| `Bash(ls:*)` | 列出目录内容，探索仓库结构 |
| `Bash(cat:*)` | 读取文件内容，用于 diff 上下文和提交信息生成 |
| `Bash(find:*)` | 在仓库中查找文件和目录 |
| `Bash(grep:*)` | 搜索文件内容中的模式，用于代码审查 |
| `Bash(mkdir:*)` | git 操作需要时创建目录 |
| `Bash(cp:*)` | 分支或合并操作时复制文件 |
| `Bash(wc:*)` | 统计行数/字数，用于变更摘要 |
| `Read` | Claude 内置文件读取 |
| `Write` | Claude 内置文件写入 |
| `Edit` | Claude 内置文件编辑 |
| `Grep` | Claude 内置内容搜索 |
| `Glob` | Claude 内置文件模式匹配 |

## Skill 文件格式

自定义 skill 文件（`.md`）通过 `$ARGUMENTS=<value>` 接收用户输入。Skill 必须正确处理该输入并产出特定格式的输出，否则通知跳转和应用内链接将无法工作。

### 参数

| 命令 | `$ARGUMENTS` | 格式 |
|------|-------------|------|
| **git-push** | _（无）_ | 固定指令，无参数 |
| **create-pr** | `<branch>` | 单分支（`main`）= 目标分支；空格分隔（`dev main`）= `{branchFrom} {branchTo}` |
| **review-pr** | `<pr-url>` | 完整 PR URL，如 `https://github.com/owner/repo/pull/123` |

分支输入来自分支选择器 UI（输入新分支或从历史选择），原始文本直接作为 `$ARGUMENTS` 传递。

### 必需输出：Git URL

扩展从 Claude 输出中提取 URL，用于 `terminal-notifier` 可点击通知和应用内链接。缺少 URL = 通知仍会触发但无法点击跳转。

| 命令 | 需要的 URL | 示例 |
|------|-----------|------|
| **git-push** | Commit URL | `https://github.com/owner/repo/commit/abc1234` |
| **create-pr** | PR URL | `https://github.com/owner/repo/pull/42` |

支持平台：GitHub、GitLab、Bitbucket。SSH 远程地址自动转换为 HTTPS。

### 必需输出：审查报告（仅 review-pr）

Review PR 命令使用 `!--------!` 分隔符从 Claude 输出中提取报告预览。Skill 必须将最终审查报告用两个 `!--------!` 标记包裹。标记之间的内容会在任务详情面板中显示为格式化的报告预览。

如果缺少分隔符，审查输出仍会以原始流式文本显示，但结构化的报告预览功能将不可用。

```
!--------!
## 审查摘要
...报告内容...
!--------!
```

### 示例：create-pr skill

```markdown
创建 Pull Request。

解析 `$ARGUMENTS` 作为分支输入：
- 空格分隔的两个值（如 `dev main`）：源分支 + 目标分支
- 单个值（如 `main`）：当前分支为源，该值为目标

步骤：
1. 暂存并提交未提交的更改
2. 推送源分支到远程
3. 通过 `gh pr create` 创建 PR
4. 输出 PR URL（如 https://github.com/owner/repo/pull/123）
```

## 截图

| Git Push | Create PR | Review PR |
|----------|-----------|-----------|
| ![Git Push](media/git_push.png) | ![Create PR](media/create_pr.png) | ![Review PR](media/review_pr.png) |

| 配置目录与 Skill | 任务详情 |
|-----------------|---------|
| ![配置目录](media/manage_folders.png) | ![任务详情](media/task_detail.png) |

## 开发

```bash
npm install
npm run build       # ray build
npm run dev         # ray develop（监听模式）
npm run lint        # ray lint
npm run fix-lint    # ray lint --fix
```

## 许可证

MIT
