# Pro Management (Raycast Extension)

快速管理和打开本地项目目录的 Raycast 扩展插件，支持多 IDE 一键启动、置顶和收藏。

## ✨ 核心特性

- **📂 自动扫描**：配置项目根目录列表，自动递归扫描目录中的 Git 仓库（默认搜索深度 4）。
- **🔍 极速检索**：支持对项目名称和路径的模糊搜索过滤，全键盘导航支持。
- **📌 灵活组织**：支持项目置顶（Pin）和收藏（Favorite）功能，并带有排序优先级，常用项目始终优显。
- **🛠️ 一键操作**：内置多种终端及 IDE 命令，支持直接在选定项目目录中打开。
- **⚙️ 自定义扩展**：可以在设置中追加自定义的 IDE 或工具命令，灵活应对各种开发环境。

## 🚀 快捷键与操作

### 默认可用命令

| 命令名称 | 快捷键 | 执行操作 |
| --- | --- | --- |
| **Antigravity** | `Cmd + A` | `agy {path}` |
| **IntelliJ IDEA** | `Cmd + I` | `idea {path}` |
| **PyCharm** | `Cmd + Y` | `pycharm {path}` |
| **iTerm2** | `Cmd + T` | `open -a iTerm {path}` |
| **Fork** | `Cmd + F` | `fork {path}` |

### 项目管理操作

| 操作 | 快捷键 | 描述 |
| --- | --- | --- |
| **置顶 / 取消置顶** | `Cmd + Shift + P` | 将项目在列表中置顶 |
| **收藏 / 取消收藏** | `Cmd + Shift + F` | 将项目标记为收藏，优先排序 |
| **复制路径** | `Cmd + Shift + C` | 复制项目绝对路径到剪贴板 |
| **在 Finder 中打开** | `Cmd + Shift + O` | 使用访达打开对应目录 |

## ⚙️ 偏好设置 (Preferences)

- **扫描目录 (Scan Directories)** *(必填)*: 
  项目所在的一级或核心上级目录。使用逗号分隔多个路径。例如：`~/project,~/work`。插件会自动识别当中的子级 Git 项目。
- **自定义命令 (Custom Commands)** *(选填)*: 
  追加自定义命令。格式为 `name:template`，使用逗号分隔多个。例如想要增加 VS Code 或 Cursor 支持：
  `code:code {path},cursor:cursor {path}`
- **全域技能库 (Global Skill Directory)** *(专属 Manage Skills 设定，必填)*: 
  用于统一存放全域或个人的 AI Prompt 及 Skill 定义所在的绝对路径（例如：`~/.agents/skills`）。引擎会自动从此文件夹抽取基础技能供下发。

## 🤖 管理 AI 技能 (Manage Skills)

这是一个专门面向开发者的 **全栈 AI Agent 能力编排中枢**，它融合了 `Antigravity`、`Claude Code`、`Cursor` 以及 `GitHub Copilot` 的底层自定义指令目录规范。

- **去重与聚合呈现**：引擎会将不同应用、不同业务组目录下的同名 AI 技能合并为同一实体，不仅能通过标签直观看到一个技能被分发到了哪个项目，还能知道分发给了具体的哪个 Agent (如 `[Global]`, `[1 Projects] (包含其悬浮详情)`)。
- **双向流转机制**：
  - **安装至业务线 (Install to Project)**：通过 `Cmd + K` 呼出指令，可一键把有用的全局指令通过 `Install` 投射进你的本地仓库（如选 `Pro Management` 项目下的 `Cursor` 客户端），底层将自动转换为对应的 `.mdc` 等适用格式。
  - **云化备份 (Sync to Global)**：某一条只存在业务线目录下的孤立新 Prompt 如果特别好用，也可选 "Sync to Global" 直接倒抽至全局公用池。

## 📦 安装与开发

1. 确保已安装 [Raycast](https://www.raycast.com/)。
2. 安装依赖并启动本地开发：
   ```bash
   npm install
   npm run dev
   ```
3. 构建生产包：
   ```bash
   npm run build
   ```
