# Pro Management (Raycast Extension)

*[English](#english) | [简体中文](#简体中文)*

---

## English

A powerful, all-in-one workspace and AI Skill management productivity tool designed for developers. This Raycast Extension seamlessly bridges the gap between massive local codebases and the modern AI-assisted development workflow.

We provide two primary commands:
1. **Search Projects**: Quickly discover, organize, and open local codebases across multiple IDEs.
2. **Manage Skills**: A Single Source of Truth (SSOT) orchestrator to synchronize and distribute AI agent prompts/skills across various AI tools (Antigravity, Claude Code, Cursor, GitHub Copilot).

### 🚀 Command 1: Search Projects

Tangled in dozens of microservices and local repositories? **Search Projects** auto-scans your workspace directories and lets you jump directly into any Git project with your preferred IDE.

* **📂 Auto-Discovery**: Configure your core root paths. The extension will recursively locate valid Git repositories (up to depth 4).
* **🔍 Blazing Fast Search**: Fuzzy search through project names or paths with full keyboard navigation.
* **📌 Workspace Organization**: Pin your active sprints to the top, favorite long-term repositories, and let the algorithm gracefully sort the rest based on your usage frequency.
* **🛠️ Native IDE Integrations**: One-click opening for `IntelliJ IDEA`, `PyCharm`, `iTerm2`, `Fork`, and `Antigravity`.
* **⚙️ Extensible Actions**: Inject your custom CLI launchers via preferences (e.g., VS Code, Cursor).

### 🤖 Command 2: Manage AI Skills

The AI ecosystem is fragmented. Every application (Cursor, Copilot, Claude CLI) enforces its own local rule directory (`.cursorrules`, `.claude/skills`, `.agents/skills`). **Manage Skills** is an authoritative orchestration center to sync them all.

* **Unified Agent Registry**: We aggregate and deduplicate AI skills scattered across your various projects and tools.
* **SSOT Symlink Distribution**: No more "Configuration Drift". We use Symlinks for distribution to ensure that an edit to a prompt in one IDE immediately reflects globally across all AI agents.
* **Non-Universal Agent Support**: Automatically detects and injects prompts to agents that require specific global paths (e.g., Claude Code).
* **Bi-Directional Sync**: 
  - *Install to Project*: Inject global rules into a specific local repo.
  - *Sync to Global*: Promote a highly-effective local prompt to the global canonical pool.

#### 💾 Skill Backup Engine
We've integrated a robust backup engine. When you configure a backup directory, any global sync will automatically write a physical clone of your AI skill to your backup folder, ensuring your knowledge is never lost even if workspaces are deleted.

### ⚙️ Preferences & Configuration

| Preference Name | Description | Example |
| --- | --- | --- |
| **Scan Directories**<br/>*(Required)* | Core directories containing your repositories. We automatically identify nested Git projects. Separate with commas. | `~/project,~/work` |
| **Custom Commands**<br/>*(Optional)* | Inject custom shell commands for actions. Format is `Name:Command`, separated by commas. | `VSCode:code {path},Cursor:cursor {path}` |
| **Global Skill Directory**<br/>*(Required)* | The canonical `.agents` directory for global unified skills. | `~/.agents/skills` |
| **Skill Backup Directory**<br/>*(Optional)* | A safe path to physically clone and backup skills to. Leave blank to disable auto-backup. | `~/backup/skills` |

### ⌨️ Shortcuts Reference

**Project Management**
| Action | Shortcut |
| --- | --- |
| **Open with Antigravity** | `Cmd + G` |
| **Open with IDEA / PyCharm** | `Cmd + I` / `Cmd + Y` |
| **Toggle Pin / Favorite** | `Cmd + Shift + P` / `Cmd + Shift + F` |
| **Copy Path** | `Cmd + Shift + C` |
| **Reveal in Finder** | `Cmd + Shift + O` |

**Skill Management**
| Action | Shortcut |
| --- | --- |
| **View Installations Detail** | `Cmd + D` |
| **Install Skill to Project** | `Enter` |
| **Backup Skill** | `Cmd + Shift + B` |
| **Sync to Global** | `Cmd + Shift + U` |

---

## 简体中文

一款专为开发者设计的、融合本地项目空间与 AI Agent 技能管理的生产力工具。通过 Raycast Extension 形式，无缝连接庞大的本地代码库环境与现代 AI 辅助开发工作流。

本插件提供两大核心能力：
1. **Search Projects**：一键搜索、组织并利用各类 IDE 打开本地海量项目代码库。
2. **Manage Skills**：首创的 AI 提示词（Prompt/Skill）分发中枢。基于单一数据源（SSOT）架构，统一调度管理 Antigravity、Claude Code、Cursor、GitHub Copilot 等割裂的 AI 工具规范。

### 🚀 第一核心: 搜录项目 (Search Projects)

深陷在数十个微服务与本地仓库中迷失方向？**Search Projects** 会静默扫描你的各个工作区根目录，帮助你以最快速度定位并进入开发状态。

* **📂 自动扫描与发现**：只需配置一次你的研发根目录（支持配置多个），即可跨文件夹抓取所有深层级（4级）内的有效 Git 仓库。
* **🔍 极速检索体验**：支持项目名称与文件路径双维度模糊搜索。
* **📌 灵活组合管理**：将当前冲刺计划的代码库置顶 (Pin)，收藏长线项目库 (Favorite)，剩余项将依据使用频率通过热力算法自动降序排序。
* **🛠️ 预置丰富启动器**：无感调起 `IntelliJ IDEA`, `PyCharm`, `iTerm2`, `Fork` 及内置的 `Antigravity`。
* **⚙️ 支持极限扩展**：只需在扩展配置处输入定制规范，可毫无缝隙地适配外部环境 CLI（如注入 VS Code 或 Cursor）。

### 🤖 第二核心: AI 技能管理 (Manage Skills)

当前的 AI 开发生态陷入碎片化。不论是 Cursor、Copilot 还是 Claude Code 命令行，全都规定自建孤立配置逻辑（如 `.cursorrules` 或 `.claude/skills` 等）。本插件为终结这一痛点而生，提供了一个强制性、中央枢纽级的规范引擎。

* **统一 Agent 档案所**：聚合并动态呈现分散在各工作流与工具流内的 AI 规则集。
* **SSOT 原理性分配**：告别配置漂移，放弃机械的复制。底层一律采用 **软链接 (Symlink)** 渗透入业务线，一份改动瞬间覆盖全部关联 Agent，修改永远直通 Master 版本。
* **孤立应用 (Non-Universal) 主动感知**：对于必须强校验全局变量存放规则的命令行 Agent（例如 Claude Code），扩展将在确认后主动注射。
* **双向生命周期轮转**：
  - *下发至项目 (Install to Project)*：按需调配指定一条公共经验集应用至指定业务仓库。
  - *回抽共享 (Sync to Global)*：若是发现单独业务线孕育了极其高效的新 Prompt，通过 Sync 直接使其沉淀进入中央规则词库。

#### 💾 技能灾备引擎
防患于未然。我们在底层植入了物理型快照隔离功能：只要你选定独立的灾备存盘根目录，任何主动进行的全域回抽或操作，都会触发一轮隔离克隆备份，工作区全盘丢失也不会导致数月的对话思维化整为零。

### ⚙️ 偏好设置 (Preferences)

| 设置名称 | 功能描述 | 填入示例 |
| --- | --- | --- |
| **搜录根目录 (Scan Directories)**<br/>*(必填)* | 填入项目集中的一级或二层根目录路径。请以英文逗号切分多路径支持。 | `~/project,~/work` |
| **自定义命令 (Custom Commands)**<br/>*(选填)* | 按 `名称:CLI配置段` 挂载外部执行器。同样支持英逗号多重堆叠。 | `VSCode:code {path},Cursor:cursor {path}` |
| **全域技能库 (Global Skill Directory)**<br/>*(必定项)* | 指定中央 `.agents` 分化基站的统一绝对路径。 | `~/.agents/skills` |
| **技能备份目录 (Skill Backup Directory)**<br/>*(可选项)* | 用于对 AI 经验的隔离克隆和存档的物理安全目录，将随技能流转发生物理复制。 | `~/backup/skills` |

### ⌨️ 操作与快捷键速查

**项目面板操作**
| 意图动作 | 快捷方案 |
| --- | --- |
| **使用 Antigravity 打开** | `Cmd + G` |
| **进入 IDEA / PyCharm 开发** | `Cmd + I` / `Cmd + Y` |
| **切换 置顶 / 强制收藏状态** | `Cmd + Shift + P` / `Cmd + Shift + F` |
| **抓取目标绝对路径至剪切板** | `Cmd + Shift + C` |
| **调起在 Finder 内查看** | `Cmd + Shift + O` |

**AI 枢纽控制板**
| 意图动作 | 快捷方案 |
| --- | --- |
| **审视全系分发关联安装状态面板** | `Cmd + D` |
| **向下对业务仓库渗透依赖安装** | `Enter` (回车) |
| **对当前经验集进行手动独立灾备** | `Cmd + Shift + B` |
| **抽送孤岛规则升级至中央公用库** | `Cmd + Shift + U` |

---

## 📦 项目源码调试指南

1. 你必须先确保本地完成搭载 [Raycast](https://www.raycast.com/)。
2. 克隆本仓库拉取代码。
   ```bash
   npm install
   npm run dev
   ```
3. 等待编译结束。若确认修改妥当希望独立出包脱离 node 进程依赖：
   ```bash
   npm run build
   ```
