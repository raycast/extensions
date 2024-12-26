# Raycast Developer Handbook

# Raycast 插件开发的正确流程

## 项目初始化


```
# 创建项目目录
mkdir my-extension
cd my-extension

# 创建基本目录结构
mkdir -p src assets
```

## 配置文件设置

```
// package.json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "extension-name",
  "title": "Extension Title",
  "description": "Extension Description",
  "icon": "command-icon.png",
  "author": "your-name",
  "categories": ["Category"],
  "license": "MIT",
  "commands": [
    {
      "name": "index",
      "title": "Command Title",
      "description": "Command Description",
      "mode": "view"
    }
  ]
}
```

## 必要的依赖

```
{
  "dependencies": {
    "@raycast/api": "^1.65.1",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.0.6",
    "typescript": "^5.3.3"
  }
}
```

## 正确的脚本配置

```
{
  "scripts": {
    "build": "ray build --env dist",
    "dev": "ray develop",
    "lint": "ray lint"
  }
}
```

# 开发流程

- 编写代码在 src/index.tsx
- 使用 npm run dev 进行开发
- 在 Raycast 中启用开发者模式
- 导入并测试插件

# 测试和发布准备

- 使用 npm run build 构建
- 测试所有功能
- 准备发布到 Raycast Store

# 最佳实践

1. 配置文件
- 必须使用官方 schema
- 正确设置命令和权限
- 提供清晰的描述和图标

2. 依赖管理

- 核心依赖放在 dependencies
- 开发工具放在 devDependencies
- 使用兼容的版本号

3. 开发者模式

- 开发模式，始终使用 npm run dev 进行开发
- 实时查看变更效果
- 及时处理错误提示

4. 调试技巧

- 使用 Raycast 的开发者工具
- 查看控制台输出
- 测试各种边界情况

