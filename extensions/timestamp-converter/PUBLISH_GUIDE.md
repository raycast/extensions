# Raycast Store 发布指南

## ✅ 已完成的准备工作

1. ✅ **项目文件整理**
   - 删除了所有内部开发文档
   - 删除了开发脚本
   - 保留了必需的文件

2. ✅ **必需文件已创建**
   - README.md - 专业简洁的项目说明
   - CHANGELOG.md - 版本更新记录
   - LICENSE - MIT 许可证
   - metadata/ - 截图目录（已准备好）

3. ✅ **代码质量**
   - 修复了 ESLint 错误
   - 修复了 Prettier 格式问题
   - 代码已经通过检查

4. ✅ **package.json 配置**
   - 完整的扩展信息
   - 命令配置
   - 偏好设置
   - 依赖项

## 📋 发布前最后步骤

### 第 1 步：注册 Raycast 账号（如果还没有）

访问 [Raycast Store](https://www.raycast.com/store) 并登录或注册账号。

### 第 2 步：更新 package.json 中的作者信息

将 `author` 字段改为你的 Raycast 用户名：

```json
"author": "your-raycast-username"
```

💡 **提示**：你可以在 Raycast 网站的个人资料中找到你的用户名。

### 第 3 步：添加截图（强烈推荐）

在 `metadata/` 目录中添加扩展的截图：

1. 打开 Raycast 并使用扩展
2. 截图展示关键功能：
   - 转换时间戳
   - 转换日期时间
   - 当前时间显示
   - 偏好设置

3. 将截图保存到 `metadata/` 目录，命名为：
   - `timestamp-converter-1.png`
   - `timestamp-converter-2.png`
   - 等等...

### 第 4 步：最后检查

运行以下命令确保一切正常：

```bash
# 检查代码质量（可能会提示 author 问题，修改后再运行）
npm run lint

# 测试扩展功能
npm run dev
```

### 第 5 步：发布到 Raycast Store

运行发布命令：

```bash
npm run publish
```

这个命令会：
1. 验证你的扩展配置
2. 检查代码质量
3. 将扩展提交到 Raycast Store 审核

### 第 6 步：等待审核

- Raycast 团队会审核你的扩展
- 通常需要几天时间
- 他们可能会要求修改或提供更多信息
- 审核通过后，你的扩展就会出现在 Raycast Store！

## 📝 发布注意事项

### 必须修改的内容

1. **author 字段**：必须是你的真实 Raycast 用户名
2. **截图**（推荐）：有助于审核通过和用户了解扩展

### 可选优化

1. **添加更详细的 README**：更多使用示例
2. **添加 GIF 演示**：动态展示功能
3. **多语言支持**：如果你想支持其他语言

## 🚨 常见问题

### Q: "Invalid owner" 错误
A: 需要先在 Raycast Store 注册账号，然后使用正确的用户名更新 `author` 字段。

### Q: 需要截图吗？
A: 不是必需的，但强烈推荐。截图可以帮助审核团队和用户更好地了解你的扩展。

### Q: 审核需要多久？
A: 通常是 2-5 个工作日，取决于提交队列的情况。

### Q: 如何更新已发布的扩展？
A: 修改代码后，更新 `CHANGELOG.md` 和 `package.json` 中的版本号，然后再次运行 `npm run publish`。

## 📦 当前项目结构

```
timestamp-converter/
├── src/
│   ├── index.tsx         # 主命令
│   └── utils.ts          # 工具函数
├── assets/
│   └── command-icon.png  # 图标
├── metadata/
│   └── README.md         # 截图说明
├── command-icon.png      # 扩展图标
├── package.json          # 扩展配置
├── tsconfig.json         # TypeScript 配置
├── README.md             # 项目说明
├── CHANGELOG.md          # 更新日志
├── LICENSE               # MIT 许可证
└── .gitignore            # Git 忽略文件
```

## 🎉 准备好了吗？

完成上述步骤后，运行：

```bash
npm run publish
```

祝你发布顺利！🚀

