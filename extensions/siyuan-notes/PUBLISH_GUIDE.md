# SiYuan Notes Raycast 扩展发布指南

## 🚀 安装到您的 Raycast

### 方法一：开发模式安装（推荐用于测试）

1. **安装 Raycast CLI**（如果尚未安装）：
   ```bash
   npm install -g @raycast/api@latest
   ```

2. **在扩展目录中启动开发模式**：
   ```bash
   cd /Users/carpe/Documents/siyuan-raycast
   npm run dev
   ```

3. **在 Raycast 中测试**：
   - 打开 Raycast (⌘ + Space)
   - 搜索 "Siyuan Notes" 相关命令
   - 测试所有功能是否正常工作

### 方法二：本地构建安装

1. **构建扩展**：
   ```bash
   npm run build
   ```

2. **导入到 Raycast**：
   - 打开 Raycast
   - 进入 Extensions
   - 点击 "Import Extension"
   - 选择项目目录

## 📋 发布前检查清单

### 必须修改的配置

1. **更新 package.json 中的 author 字段**：
   ```json
   {
     "author": "your-raycast-username"
   }
   ```
   > ⚠️ 重要：将 "your-raycast-username" 替换为您在 Raycast 平台上的实际用户名

2. **验证所有配置**：
   ```bash
   npm run lint
   npm run build
   ```

### 功能测试

- ✅ 搜索笔记功能
- ✅ 创建笔记功能  
- ✅ 每日笔记功能
- ✅ 最近笔记功能
- ✅ 文件链接打开功能
- ✅ SiYuan 服务器连接测试

## 🌟 发布到 Raycast Store

### 准备工作

1. **确保您有 Raycast 账户**：
   - 访问 [raycast.com](https://raycast.com)
   - 注册或登录账户
   - 记下您的用户名

2. **准备发布材料**：
   - ✅ 扩展图标 (assets/icon.png)
   - ✅ README.md 文档
   - ✅ CHANGELOG.md
   - ✅ 完整的功能描述

### 发布步骤

1. **运行发布命令**：
   ```bash
   npm run publish
   ```

2. **按照提示操作**：
   - 系统会自动打开浏览器
   - 登录您的 Raycast 账户
   - 授权扩展发布

3. **创建 Pull Request**：
   - 发布命令会自动创建 PR 到 raycast/extensions 仓库
   - 等待 Raycast 团队审核
   - 根据反馈修改代码（如有需要）

### 审核过程

- **自动检查**：代码质量、构建、类型检查
- **手动审核**：功能测试、用户体验、安全性
- **时间估计**：通常 3-7 个工作日

## 🔧 常见问题解决

### 1. Author 验证失败
```bash
error - Invalid author "yourusername". error: 404 - Not found
```
**解决方案**：确保 package.json 中的 author 字段是您在 Raycast 上的正确用户名。

### 2. 图标路径问题
**解决方案**：确保图标文件位于 `assets/icon.png`，大小为 512x512px。

### 3. API 连接测试
**配置 SiYuan**：
- 确保 SiYuan 服务器运行在 http://127.0.0.1:6806
- 如需要，配置 API Token
- 设置正确的工作空间路径

## 📝 版本更新

### 发布新版本

1. **更新版本号**：
   ```bash
   npm version patch  # 修复版本
   npm version minor  # 新功能版本
   npm version major  # 重大更新版本
   ```

2. **更新 CHANGELOG.md**

3. **重新发布**：
   ```bash
   npm run publish
   ```

## 🎯 成功发布后

1. **扩展将出现在 Raycast Store**
2. **用户可以搜索 "SiYuan Notes" 安装**
3. **您将获得安装统计和用户反馈**
4. **可以通过 GitHub 管理后续更新**

---

## 🚨 重要提醒

1. **请务必将 `author` 字段更新为您的实际 Raycast 用户名**
2. **确保 SiYuan 服务器在发布前可以正常连接**
3. **测试所有功能在不同场景下的表现**
4. **阅读 Raycast 的扩展发布指南以了解最新要求**

祝您发布成功！🎉