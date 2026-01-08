# 下一步操作指南

恭喜!FNM Raycast 扩展的代码已经完成。以下是接下来需要完成的步骤:

## 🎯 立即需要完成的任务

### 1. 创建图标 (必需)

扩展需要一个 512x512 像素的 PNG 图标才能运行。

**选择以下方式之一:**

#### 方式 A: 使用在线工具转换 SVG (最简单)
```bash
# 1. 访问 https://cloudconvert.com/svg-to-png
# 2. 上传 assets/icon-template.svg
# 3. 设置尺寸为 512x512
# 4. 下载并重命名为 icon.png
# 5. 放到 assets/ 目录
```

#### 方式 B: 使用 ImageMagick (命令行)
```bash
# 安装 ImageMagick
brew install imagemagick

# 转换 SVG 到 PNG
cd assets
convert icon-template.svg -resize 512x512 icon.png
```

#### 方式 C: 使用临时占位符
```bash
# 使用任意 512x512 的 PNG 图片作为临时图标
# 将图片重命名为 icon.png 并放到 assets/ 目录
cp /path/to/your/image.png assets/icon.png
```

### 2. 安装依赖

```bash
cd /Users/gefangshuai/Documents/Dev/myspace/fnm-raycast
npm install
```

### 3. 启动开发模式

```bash
npm run dev
```

这将在 Raycast 中加载扩展。

### 4. 测试功能

在 Raycast 中测试所有命令:

- [ ] `List Node.js Versions` - 列出版本
- [ ] `Install Node.js Version` - 安装版本
- [ ] `Use Node.js Version` - 切换版本
- [ ] `Uninstall Node.js Version` - 卸载版本

## 📋 完整的启动检查清单

### 前置条件
- [ ] fnm 已安装 (`brew install fnm`)
- [ ] fnm 已配置到 shell (`eval "$(fnm env --use-on-cd)"`)
- [ ] 至少安装了一个 Node.js 版本 (`fnm install --lts`)

### 开发环境
- [ ] 已创建 `assets/icon.png` 文件
- [ ] 已运行 `npm install`
- [ ] 已运行 `npm run dev`
- [ ] Raycast 中可以看到扩展

### 功能测试
- [ ] 可以列出已安装的版本
- [ ] 可以安装新版本
- [ ] 可以切换版本
- [ ] 可以设置默认版本
- [ ] 可以卸载版本
- [ ] 错误提示正常显示
- [ ] 快捷键正常工作

## 🚀 发布准备(可选)

如果您想将扩展发布到 Raycast Store:

### 1. 完善信息

检查 `package.json` 中的信息:
- [ ] `name` - 扩展名称
- [ ] `title` - 显示标题
- [ ] `description` - 描述
- [ ] `author` - 作者名称
- [ ] `icon` - 图标路径

### 2. 代码质量检查

```bash
# 运行代码检查
npm run lint

# 自动修复问题
npm run fix-lint
```

### 3. 构建扩展

```bash
npm run build
```

### 4. 发布到 Raycast Store

```bash
npm run publish
```

按照提示完成发布流程。

## 📚 推荐阅读

- [README.md](README.md) - 完整的项目说明
- [QUICKSTART.md](QUICKSTART.md) - 5 分钟快速开始
- [INSTALL.md](INSTALL.md) - 详细安装指南
- [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献代码指南
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目技术总结

## 🛠️ 常见问题

### Q: 运行 `npm run dev` 后在 Raycast 中找不到扩展?

**A:** 检查以下几点:
1. 确保 `assets/icon.png` 文件存在
2. 确保 `npm install` 已成功完成
3. 在 Raycast 中搜索 "FNM" 或 "Node"
4. 查看终端是否有错误信息

### Q: 扩展提示 "fnm not found"?

**A:** 确保:
1. fnm 已安装: `brew install fnm`
2. 已添加到 shell 配置: `echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc`
3. 重新加载配置: `source ~/.zshrc`
4. 验证安装: `which fnm`

### Q: 如何更新扩展代码?

**A:** 
1. 修改源代码
2. 保存文件
3. Raycast 会自动重新加载
4. 如果没有自动重新加载,重新运行 `npm run dev`

### Q: 如何调试扩展?

**A:**
1. 在代码中添加 `console.log()`
2. 打开 Raycast 开发者工具(在扩展中按 ⌘+⌥+I)
3. 查看控制台输出

## 🎉 完成后

一旦完成上述步骤,您就可以:

1. **日常使用**: 通过 Raycast 快速管理 Node.js 版本
2. **分享**: 将扩展分享给团队成员
3. **发布**: 提交到 Raycast Store 供所有人使用
4. **改进**: 根据使用体验继续优化功能

## 💡 功能增强建议

如果您想继续改进扩展,可以考虑添加:

- [ ] 版本搜索功能
- [ ] 显示版本发布日期
- [ ] 支持 .nvmrc 文件检测
- [ ] 版本更新提醒
- [ ] 批量操作支持
- [ ] 版本使用统计
- [ ] 自定义版本别名

## 📞 获取帮助

如果遇到问题:

1. 查看项目文档(README.md, INSTALL.md 等)
2. 查看 [fnm 官方文档](https://github.com/Schniz/fnm)
3. 查看 [Raycast 开发文档](https://developers.raycast.com)
4. 在 GitHub 上提交 issue

---

**祝您使用愉快!** 🎊

如果这个扩展对您有帮助,欢迎:
- ⭐ 给项目点个 Star
- 🐛 报告 Bug 和建议
- 🤝 贡献代码
- 📢 分享给其他开发者
