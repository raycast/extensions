# Raycast Trae Open

一个 Raycast 扩展，用于使用 Trae 编辑器打开文件或目录，以及创建新的 Trae 窗口。

## 🎯 功能特点

- 🔍 **智能打开**: 自动检测 Finder 中选中的文件或目录，用 Trae 打开
- 🆕 **新建窗口**: 专用命令创建新的 Trae 窗口
- ⚙️ **自定义路径**: 支持在首选项中配置自定义 Trae 应用路径
- 🎯 **智能检测**: 自动检测常见 Trae 安装路径
- 📱 **友好提示**: 操作成功或失败都会显示相应的提示信息
- 🛡️ **类型安全**: 完整的 TypeScript 支持
- 🧪 **错误处理**: 完善的错误处理和用户反馈

## 📋 使用方法

### 智能打开命令

1. 在 Finder 中选择一个或多个文件/目录
2. 激活 Raycast (⌘+空格)
3. 输入 "Open with Trae" 并回车
4. Trae 将打开选中的第一个项目

### 新建窗口命令

1. 激活 Raycast (⌘+空格)
2. 输入 "New Trae Window" 并回车
3. 创建新的 Trae 窗口

## ⚙️ 配置选项

在 Raycast 扩展设置中可以配置：

- **Trae Application Path**: 自定义 Trae 应用路径（可选）
  - 默认路径：`/Applications/Trae.app/Contents/MacOS/Electron`
  - 如果 Trae 安装在非标准位置，可以在这里指定

## 📦 安装要求

- macOS
- Raycast
- Trae 编辑器（已安装）

## 🛠️ 开发指南

### 项目结构

```
src/
├── index.ts       # 主命令：智能打开或新建窗口
├── new-window.ts  # 新建窗口命令
└── utils.ts       # 工具函数
```

### 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm dev

# 构建项目
pnpm build

# 类型检查
pnpm tsc --noEmit

# 发布到 Raycast Store
pnpm publish
```

### 代码规范

- 使用 TypeScript 严格模式
- 完整的 JSDoc 注释
- 错误处理和用户反馈
- 模块化设计

## 🔧 技术特点

### TypeScript 配置

- **严格模式**: 启用所有严格类型检查
- **ES2022**: 使用现代 JavaScript 特性
- **CommonJS**: 兼容 Node.js 模块系统
- **Source Maps**: 支持调试

### 代码质量

- **类型安全**: 完整的类型定义
- **错误处理**: 完善的异常捕获
- **用户友好**: 清晰的错误提示
- **模块化**: 可维护的代码结构

## ❓ 常见问题

### Trae 未找到

如果提示 "Trae application not found"，请：

1. 确保 Trae 已正确安装
2. 在扩展首选项中配置正确的 Trae 路径
3. 检查 Trae 是否在 `/Applications` 目录下

### Finder 权限问题

如果扩展无法获取 Finder 选中的项目，请：

1. 确保 Raycast 有访问 Finder 的权限
2. 在系统设置 > 隐私与安全 > 辅助功能 中启用 Raycast

### 构建失败

如果遇到构建问题：

1. 确保 Node.js 版本兼容
2. 清理 `node_modules` 并重新安装依赖
3. 检查 TypeScript 配置

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License