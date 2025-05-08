# Quick Prompt

一款为 **Raycast** 打造的高效提示词（Prompt）管理与快捷输入扩展，集成快捷输入、创建、编辑、删除、启用/禁用等全方位功能，并且支持本地文件与远程 URL 数据同步，让提示词管理及输入更加便捷高效。

> 由于[浏览器插件版 Quick Prompt](https://github.com/wenyuanw/quick-prompt) 存在一定使用限制，所以我开发了这款 Raycast 扩展，实现在任意 AI 应用和网页中的提示词快速插入。秉承"一处管理，处处可用"的理念，完美兼容浏览器插件数据格式，支持通过相同 JSON 结构进行无缝数据迁移。

## 功能特性

- 🚀 **快速插入 Prompt**：在任意应用中一键插入或复制已启用的 Prompt 内容。
- 🗂️ **Prompt 管理**：支持创建、编辑、删除、启用/禁用 Prompt，并可通过标签和关键词进行筛选与搜索。
- ✍️ **快捷保存选中文本为 Prompt**：在任意应用中将当前选中的文本内容保存为新的 Prompt，便于知识沉淀和复用。
- 📤 **导入/导出功能**：支持将 Prompt 导出为 JSON 文件，也可从本地文件或远程 URL 导入 Prompt 数据，方便在多设备间同步和备份。

## 安装方法

1. 在 Raycast Store 搜索 `Quick Prompt` 并安装，或从源码构建
2. 在 Raycast 中通过 `Extensions` -> `Import Extension` 导入构建产物。

## 使用说明

### 1. 快速插入 Prompt

- 触发命令：`Apply Prompt`
- 功能：显示所有已启用的 Prompt，支持搜索、粘贴、复制、切换启用状态、删除等操作。

### 2. 管理 Prompt

- 触发命令：`Manage Prompt`
- 功能：管理所有 Prompt（包括已禁用的），支持创建、编辑、删除、切换启用状态、导入、导出等。

### 3. 保存选中文本为 Prompt

- 触发命令：`Save Selected Text`
- 功能：自动获取当前应用中选中的文本，快速保存为新的 Prompt。

### 4. 创建/编辑 Prompt

- 字段包括：标题、内容、标签（逗号分隔）、启用状态。
- 支持表单校验与便捷交互。

### 5. 导入/导出 Prompt

- **导出功能**：将当前所有 Prompt 导出为 JSON 文件保存到桌面，并自动复制到剪贴板。
- **导入功能**：支持从本地 JSON 文件或远程 URL 导入 Prompt 数据，自动合并重复项。

## 许可协议

MIT License

## 贡献

欢迎提交 Issue 和 PR，完善功能与体验！
