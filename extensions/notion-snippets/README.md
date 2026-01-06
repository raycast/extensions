# Notion Snippets for Raycast

<img src="assets/icon.png" width="128" height="128" />

Turn your Notion databases into a high-performance snippet manager for Raycast. Sync code snippets, canned responses, microblogs, and bookmarks instantly.
Support **Hybrid Search** (Local Instant + Global Cloud) and **Import to Raycast Native Snippets**.

---

<br/>

## ✨ Features

- **🚀 Hybrid Search Engine**:
  - **Local Acceleration**: The latest 100 snippets are cached locally for 0-latency instant search.
  - **Global Cloud Search**: Search terms not found locally will automatically trigger a Notion Cloud search.
  - **CJK Optimized**: Intelligent exact matching for CJK characters prevents fuzzy noise.

- **🧩 Native Integration**:
  - **Import to Raycast**: One-click import Notion snippets into Raycast's native snippet manager (Cmd+Shift+I).
  - **Rich Metadata**: Hover to view full titles, tags, and source database info.
  - **Archive/Delete**: "Delete" snippet actually archives it in Notion (`Ctrl+X`), preventing accidental data loss.

- **🧠 Smart Support**:
  - **Microblogs ("Say")**: Automatically titles "Untitled" posts with their content.
  - **Bookmarks ("Media")**: Intelligent URL handling for bookmark databases.

<br/>

## 🛠 Setup Guide

### 1. Create Integration

1. Go to [Notion My Integrations](https://www.notion.so/my-integrations).
2. Create a new integration (e.g., "Raycast Snippets").
3. **Copy the "Internal Integration Secret"**.

### 2. Connect Databases

You can use any database. The extension intelligently maps the following fields:

- **Name**: `Name`, `Title`, `Subject`, `In`
- **Content**: `Content`, `Body`, `Code`, `URL`, `Link`
- **Trigger**: `Trigger`, `Keyword`, `Shortcut`
- **Description**: `Description`, `Notes`, `Tags`

**Important**:
Click the `...` menu on your Notion Database page -> `Connections` -> **Add your integration**.

### 3. Configure Raycast

1. Install this extension.
2. In Raycast Settings -> Extensions -> Notion Snippets:
   - **Notion Token**: Paste your secret starting with `secret_...`
   - **Database IDs**: Paste your Database ID(s). Comma separate for multiple.

_(The Database ID is the 32-char code in your Notion URL: `notion.so/myworkspace/THIS_PART_IS_THE_ID?v=...`)_

<br/>

## ⚡️ Quick Actions

| Shortcut          | Action                | Description                                       |
| :---------------- | :-------------------- | :------------------------------------------------ |
| `Enter`           | Paste Snippet         | Paste content to active app (fills placeholders). |
| `Cmd + K`         | Actions Menu          | Show all available actions.                       |
| `Cmd + N`         | Create New            | Create a new snippet directly to Notion.          |
| `Cmd + E`         | Edit Snippet          | Edit the selected snippet.                        |
| `Cmd + Shift + I` | **Import to Raycast** | Import to native Raycast Snippets.                |
| `Cmd + Shift + E` | Export All            | Export snippets to JSON/CSV.                      |
| `Ctrl + X`        | **Delete/Archive**    | Archive the snippet in Notion (Recoverable).      |

<br/>

## 💡 Pro Tips

- **Hidden Results**: If you search for something and see a "Hidden Results" warning, it means the content exists in Notion but that database hasn't been added to your settings yet.
- **Performance**: The extension is memory-safe. It keeps your recent 100 items hot-loaded for instant access, while older items are searched on-demand from the cloud.

<br/>
<br/>
<hr/>
<br/>
<br/>

# Notion Snippets for Raycast (中文介绍)

将你的 Notion 数据库变身为 Raycast 加强版 Snippet 管理器。秒速同步代码片段、常用语、微博客和书签。
支持 **混合搜索模式** (本地秒开 + 云端检索) 和 **导入到 Raycast 原生 Snippet**。

<br/>

## ✨ 功能亮点

- **🚀 混合搜索引擎**:
  - **本地加速**: 本地缓存最新的 100 条数据，实现 0 延迟秒开搜索。
  - **全局云搜索**: 本地未找到时，自动触发 Notion 全局云端搜索，海量数据也能搜。
  - **中文优化**: 针对中文优化的精确匹配算法，告别模糊搜索的干扰。

- **🧩 原生级集成**:
  - **一键导入 Raycast**: 支持一键将 Notion 内容导入到 Raycast 原生 Snippet 管理器，从此告别复制粘贴 (Cmd+Shift+I)。
  - **丰富元数据**: 悬停查看完整标题、标签和来源数据库。
  - **安全删除**: "删除" 操作实际上是将 Notion 页面归档 (`Ctrl+X`)，防止误删，可随时恢复。

- **🧠 智能兼容**:
  - **微博客模式 ("Say")**: 支持 "Say" 微博客模式，自动将无标题内容的首行作为标题展示。
  - **书签模式 ("Media")**: 支持 "Media" 书签模式，智能解析 URL。

<br/>

## 🛠 设置指南

### 1. 创建集成

1. 前往 [Notion My Integrations](https://www.notion.so/my-integrations)。
2. 创建一个新集成 (例如叫 "Raycast Snippets")。
3. **复制 "Internal Integration Secret"**。

### 2. 连接数据库

你可以使用任何数据库。插件会智能匹配以下字段：

- **标题 (Name)**: `Name`, `Title`, `Subject`, `In`
- **内容 (Content)**: `Content`, `Body`, `Code`, `URL`, `Link`
- **快捷键 (Trigger)**: `Trigger`, `Keyword`, `Shortcut`
- **描述 (Description)**: `Description`, `Notes`, `Tags`

**重要**:
在 Notion 数据库页面点击 `...` 菜单 -> `Connections` -> **添加你的集成**。

### 3. 配置插件

1. 安装本插件。
2. 在 Raycast Settings -> Extensions -> Notion Snippets:
   - **Notion Token**: 填入 `secret_` 开头的密钥。
   - **Database IDs**: 填入数据库 ID。多个 ID 用逗号分隔。

_(数据库 ID 是 Notion URL 中的 32 位字符: `notion.so/myworkspace/THIS_PART_IS_THE_ID?v=...`)_

<br/>

## ⚡️ 快捷操作

| 快捷键            | 操作               | 说明                                   |
| :---------------- | :----------------- | :------------------------------------- |
| `Enter`           | 粘贴 Snippet       | 粘贴到当前应用 (自动填充变量)。        |
| `Cmd + K`         | 操作菜单           | 显示所有可用操作。                     |
| `Cmd + N`         | 新建               | 直接新建 Snippet 到 Notion。           |
| `Cmd + E`         | 编辑               | 编辑选中的 Snippet。                   |
| `Cmd + Shift + I` | **导入到 Raycast** | 导入到 Raycast 原生 Snippet 管理器。   |
| `Cmd + Shift + E` | 导出所有           | 将 Snippet 导出为 JSON/CSV。           |
| `Ctrl + X`        | **删除/归档**      | 将 Snippet 在 Notion 中归档 (可恢复)。 |

<br/>

## 💡 使用技巧

- **隐藏结果提示**: 如果你搜索时看到 "Hidden Results" 提示，说明内容在 Notion 中存在，但该数据库尚未添加到插件设置中。
- **性能**: 插件内存安全。它将你最近的 100 条内容热加载到本地以实现秒开，更早的内容则按需云端搜索。

<br/>

## License

MIT
