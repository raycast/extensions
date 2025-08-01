# SiYuan Notes Raycast Extension

思源笔记 Raycast 扩展，让您可以在 Raycast 中快速搜索、创建和管理思源笔记。

![SiYuan Notes Extension](./icon.png)

## 功能特性

- 🔍 **笔记搜索**: 快速搜索文档和块内容
- 📝 **创建笔记**: 在指定笔记本中创建新文档  
- 📅 **每日笔记**: 快速添加内容到今日笔记
- 📋 **最近笔记**: 查看和访问最近修改的文档
- 📎 **文件链接支持**: 直接打开笔记中的附件和本地文件

## 安装和配置

1. 安装扩展到 Raycast
2. 配置以下设置：
   - **SiYuan Server URL**: 思源笔记服务器地址 (默认: http://127.0.0.1:6806)
   - **API Token**: API访问令牌 (如果启用了认证)
   - **Default Notebook ID**: 默认笔记本ID
   - **Daily Note Path**: 每日笔记路径模板 (默认: /daily/{{date}})
     * 支持思源笔记标准模板格式：如 `/daily note/{{now | date "2006/01"}}/{{now | date "2006-01-02"}}`
     * 简化格式：`笔记本名称/daily/{{date}}` (会自动转换为 YYYY-MM-DD 格式)
   - **Workspace Path**: 思源笔记工作空间目录路径 (例如: /Users/username/Documents/SiYuan)

## 工作空间路径配置

为了正确打开笔记中的文件链接和附件，请配置 **Workspace Path** 设置：

1. 找到你的思源笔记工作空间目录
2. 在扩展设置中输入完整路径，例如：
   - macOS: `/Users/yourname/Documents/SiYuan`
   - Windows: `C:\Users\yourname\Documents\SiYuan`
   - Linux: `/home/yourname/SiYuan`

配置正确后，扩展能够：
- 直接用系统默认程序打开附件文件
- 在Finder/文件管理器中显示文件位置
- 正确处理相对路径文件链接

## 使用方法

### 搜索笔记
- 使用 `Search Notes` 命令
- 输入关键词搜索文档标题和内容
- 支持按路径筛选
- 在详情页面查看完整内容

### 每日笔记
- 使用 `Add to Daily Note` 命令快速添加内容到今日笔记
- **快速添加模式**: 直接在 Raycast 中输入 `add to daily note`，按 Tab 键，然后输入内容快速添加
- 支持多种快速模板：想法、待办、链接、学习、工作等
- 自动添加时间戳（可选）
- 如果今日笔记不存在，会自动创建
- 支持 Markdown 格式

### 文件链接支持

#### 直接点击链接打开文件
在笔记详情页面的Markdown内容中：
- 文件链接会显示为 `[文件名 📎](file://路径)` 格式
- **直接点击链接**可能在某些环境下用默认程序打开文件
- 如果直接点击不工作，请使用下面的ActionPanel方式

#### 通过ActionPanel打开文件
如果笔记包含文件链接，可以使用快捷键：
- **Cmd+Alt+数字**: 用默认程序打开文件（主要方式）
- **Cmd+Shift+Opt+数字**: 使用file://协议打开（备用方式）
- **Cmd+Opt+Shift+数字**: 在Finder中显示文件
- **Cmd+Shift+数字**: 在浏览器中打开(仅限assets)

### 调试文件打开问题
如果文件无法打开，请：
1. 检查开发者控制台的调试日志
2. 确认工作空间路径配置正确
3. 首先尝试直接点击Markdown中的文件链接
4. 如果不工作，使用ActionPanel中的打开选项
5. 使用"在Finder中显示"验证文件是否存在

### 创建笔记
- 使用 `Create Note` 命令
- 选择笔记本和输入标题
- 可选择使用模板

### 每日笔记
- 使用 `Add to Daily Note` 命令
- 快速添加内容到今日笔记
- 自动创建每日笔记(如不存在)

### 最近笔记
- 使用 `Recent Notes` 命令
- 查看最近访问的文档
- 快速访问和查看详情

## 故障排除

如果遇到问题，请检查：

1. 思源笔记是否正在运行
2. API地址是否正确
3. 工作空间路径是否配置正确
4. 网络连接是否正常

可以使用搜索页面中的"测试连接"功能验证配置。

## 技术支持

如需帮助或报告问题，请查看项目文档或联系开发者。