# Quick Prompt

一个用于 Raycast 的高效提示词（Prompt）管理与快速输入扩展，支持创建、编辑、删除、启用/禁用和快速插入自定义 Prompt，极大提升日常文本输入和自动化效率。

## 功能特性

- 🚀 **快速插入 Prompt**：在任意应用中一键粘贴或复制已启用的 Prompt 内容。
- 🗂️ **Prompt 管理**：支持创建、编辑、删除、启用/禁用 Prompt，并可通过标签和关键词进行筛选与搜索。
- ✍️ **保存选中文本为 Prompt**：直接将当前选中的文本内容保存为新的 Prompt，便于知识沉淀和复用。
- 🏷️ **标签管理**：为每个 Prompt 添加标签，便于分类和检索。
- 🌗 **启用/禁用切换**：可随时切换 Prompt 的启用状态，灵活管理常用与临时 Prompt。
- 📝 **空视图友好引导**：无数据或无匹配结果时，界面会引导用户快速创建新 Prompt。

## 安装方法

1. 在 Raycast Store 搜索 `Quick Prompt` 并安装，或从源码构建：
   ```bash
   git clone https://github.com/wenyuanw/quick-prompt-raycast.git
   cd quick-prompt-raycast
   npm install
   npm run build
   ```
2. 在 Raycast 中通过 `Extensions` -> `Import Extension` 导入构建产物。

## 使用说明

### 1. 快速插入 Prompt

- 触发命令：`Apply Prompt`
- 功能：显示所有已启用的 Prompt，支持搜索、粘贴、复制、切换启用状态、删除等操作。

### 2. 管理 Prompt

- 触发命令：`Manage Prompt`
- 功能：管理所有 Prompt（包括已禁用的），支持创建、编辑、删除、切换启用状态、标签筛选等。

### 3. 保存选中文本为 Prompt

- 触发命令：`Save Selected Text`
- 功能：自动获取当前应用中选中的文本，快速保存为新的 Prompt。

### 4. 创建/编辑 Prompt

- 字段包括：标题、内容、标签（逗号分隔）、启用状态。
- 支持表单校验与便捷交互。

## 数据结构

每个 Prompt 包含如下字段：

- `id`：唯一标识
- `title`：标题
- `content`：内容
- `tags`：标签数组
- `enabled`：是否启用

## 开发与构建

- 依赖：[@raycast/api](https://www.npmjs.com/package/@raycast/api)、[@raycast/utils](https://www.npmjs.com/package/@raycast/utils)、[nanoid](https://www.npmjs.com/package/nanoid)
- 开发命令：
  - `npm run dev`：开发模式
  - `npm run build`：构建扩展
  - `npm run lint`：代码检查

## 许可协议

MIT License

## 贡献

欢迎提交 Issue 和 PR，完善功能与体验！
