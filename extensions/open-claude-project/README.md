# Open Claude Code Project

[English](#english) | [中文](#中文)

---

## English

A [Raycast](https://raycast.com) extension to quickly open recent [Claude Code](https://claude.ai/code) projects in your favorite terminal.

### Features

- **Quick Access** - Browse and open recent Claude Code projects with a single keystroke
- **Multiple Terminals** - Support for iTerm, Terminal.app, Warp, Alacritty, and Kitty
- **Favorites** - Pin frequently used projects to the top
- **Time Grouping** - Projects organized by Today, This Week, and Earlier
- **Quick Shortcuts** - `Cmd+1/2/3` to instantly open top 3 projects
- **Bilingual** - English and Chinese interface

### Installation

#### From Raycast Store (Recommended)

Search for "Open Claude Code Project" in Raycast Store.

#### Manual Installation

```bash
git clone https://github.com/anthropics/open-claude-project.git
cd open-claude-project
npm install
npm run build
```

Then import in Raycast: Search "Import Extension" and select this folder.

### Usage

1. Open Raycast and search for "Open Claude Code Project"
2. Select a project from the list
3. Press `Enter` to continue last session, or `Cmd+N` for a new session

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Continue last session (`claude -c`) |
| `Cmd+N` | New session (`claude`) |
| `Cmd+D` | Toggle favorite |
| `Cmd+1/2/3` | Quick open top 3 projects |
| `Cmd+Shift+F` | Show in Finder |
| `Cmd+Shift+C` | Copy path |
| `Cmd+R` | Refresh list |
| `Cmd+,` | Open preferences |

### Preferences

| Setting | Description | Default |
|---------|-------------|---------|
| Terminal App | Choose your preferred terminal | iTerm |
| Group by Time | Organize projects by time periods | Enabled |
| Favorites First | Show favorited projects at the top | Enabled |
| Language | Interface language (English/中文) | English |

### How It Works

This extension reads Claude Code's project data from `~/.claude/projects/` directory. It parses session files to determine the actual project paths and displays them sorted by last modification time.

### Requirements

- [Raycast](https://raycast.com)
- [Claude Code](https://claude.ai/code) installed and used at least once
- A supported terminal app (iTerm, Terminal, Warp, Alacritty, or Kitty)

---

## 中文

一个 [Raycast](https://raycast.com) 扩展，用于快速打开最近使用的 [Claude Code](https://claude.ai/code) 项目。

### 功能特性

- **快速访问** - 一键浏览和打开最近的 Claude Code 项目
- **多终端支持** - 支持 iTerm、Terminal.app、Warp、Alacritty 和 Kitty
- **收藏功能** - 将常用项目置顶显示
- **时间分组** - 按今天、本周、更早分组显示项目
- **快捷键** - `Cmd+1/2/3` 快速打开前 3 个项目
- **双语界面** - 支持中英文切换

### 安装方法

#### 从 Raycast Store 安装（推荐）

在 Raycast Store 中搜索 "Open Claude Code Project"。

#### 手动安装

```bash
git clone https://github.com/anthropics/open-claude-project.git
cd open-claude-project
npm install
npm run build
```

然后在 Raycast 中导入：搜索 "Import Extension" 并选择此文件夹。

### 使用方法

1. 打开 Raycast 并搜索 "Open Claude Code Project"
2. 从列表中选择一个项目
3. 按 `Enter` 继续上次会话，或按 `Cmd+N` 新建会话

### 快捷键

| 快捷键 | 操作 |
|--------|------|
| `Enter` | 继续上次会话 (`claude -c`) |
| `Cmd+N` | 新建会话 (`claude`) |
| `Cmd+D` | 收藏/取消收藏 |
| `Cmd+1/2/3` | 快速打开前 3 个项目 |
| `Cmd+Shift+F` | 在 Finder 中显示 |
| `Cmd+Shift+C` | 复制路径 |
| `Cmd+R` | 刷新列表 |
| `Cmd+,` | 打开偏好设置 |

### 偏好设置

| 设置 | 说明 | 默认值 |
|------|------|--------|
| 终端应用 | 选择你喜欢的终端 | iTerm |
| 按时间分组 | 按时间段组织项目 | 开启 |
| 收藏优先 | 将收藏的项目显示在顶部 | 开启 |
| 语言 | 界面语言（English/中文） | English |

### 工作原理

此扩展从 `~/.claude/projects/` 目录读取 Claude Code 的项目数据，解析会话文件以确定实际项目路径，并按最后修改时间排序显示。

### 系统要求

- [Raycast](https://raycast.com)
- [Claude Code](https://claude.ai/code) 已安装并至少使用过一次
- 支持的终端应用（iTerm、Terminal、Warp、Alacritty 或 Kitty）

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Raycast API](https://developers.raycast.com)
- For use with [Claude Code](https://claude.ai/code) by Anthropic
