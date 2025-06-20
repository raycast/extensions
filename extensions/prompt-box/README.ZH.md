# Prompt Box Raycast Extension

> **Language / 语言**: [🇺🇸 English](./README.md) | [🇨🇳 中文](./README.ZH.md)

一个用于快速管理和使用 Prompt 的 Raycast 扩展。

**这个扩展是 [pb.onlinestool.com](https://pb.onlinestool.com) 的官方 Raycast 客户端，让您可以直接在 Raycast 中管理您收藏的 prompts。**

## 功能特性

### 🔍 Search Prompts (搜索/调用)
- **命令别名**: `sp`, `search prompts`, `find prompt`
- **功能**: 搜索和快速使用已保存的 Prompts
- **操作**:
  - **Enter**: 复制 Prompt 内容到剪贴板
  - **Cmd + Enter**: 直接粘贴到最前端的应用
  - **Cmd + D**: 查看详细信息
  - **Cmd + O**: 在浏览器中打开编辑页面

### ➕ Add Prompt (快速新增)
- **命令别名**: `ap`, `add prompt`, `new prompt`
- **功能**: 快速添加新的 Prompt
- **操作**: 填写标题和内容，按 Cmd + Enter 提交

### 🔄 Sync Prompts (同步数据)
- **功能**: 从服务端同步最新数据到本地缓存
- **自动执行**: 后台同步，无需用户界面

## 安装和配置

### 方法一：永久安装（推荐）

如果您不想每次都启动开发服务器，可以将扩展永久安装到 Raycast 中：

1. **构建扩展**
   ```bash
   npm install
   npm run build
   ```

2. **在 Raycast 中导入扩展**
   - 打开 Raycast 设置（⌘ + ,）
   - 进入 "Extensions" 标签
   - 点击右上角的 "+" 按钮
   - 选择 "Add Script Directory" 或 "Import Extension"
   - 选择项目文件夹

3. **配置 API Key**
   - 在扩展设置中输入从 Prompt Box Web 端获取的 API Key
   - 扩展将永久可用，无需开发服务器

### 方法二：通过 Raycast Store 安装

> 📝 **注意**: 此扩展尚未发布到 Raycast Store，敬请稍后。

发布后您可以：
1. 打开 Raycast 设置
2. 进入 "Extensions" 标签
3. 点击 "Browse Store"
4. 搜索 "Prompt Box"
5. 点击安装

### 方法三：开发模式

如果您需要修改代码或进行开发：

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发模式**
   ```bash
   npm run dev
   ```

3. **配置 API Key**
   - 在 Raycast 中打开扩展设置
   - 输入从 Prompt Box Web 端获取的 API Key

## API 接口

### 查询 Prompts
```bash
curl --request GET \
  --url 'https://pb.onlinestool.com/api/prompts' \
  --header 'x-api-key: {{api_key}}'
```

### 创建 Prompt
```bash
curl --request POST \
  --url 'https://pb.onlinestool.com/api/prompts' \
  --header 'content-type: application/json' \
  --header 'x-api-key: {{api_key}}' \
  --data '{
    "title": "My Prompt",
    "content": "Prompt content here",
    "description": "Optional description",
    "tags": ["tag1", "tag2"]
  }'
```

## 使用流程

1. **首次使用**: 运行 `Sync Prompts` 命令同步数据
2. **搜索使用**: 使用 `sp` 命令快速搜索和使用 Prompts
3. **快速添加**: 使用 `ap` 命令快速记录新的 Prompt 灵感
4. **定期同步**: 定期运行同步命令获取最新数据

## 技术栈

- **框架**: Raycast API
- **语言**: TypeScript + React
- **存储**: Raycast LocalStorage
- **网络**: node-fetch

## 许可证

MIT License
