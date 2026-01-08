# 📦 FNM Raycast 扩展 - 发布和安装指南

## 🎯 三种使用方式

### 方式一: 本地开发模式(推荐先测试)

这是最快的方式,适合开发和测试:

#### 步骤 1: 准备环境

```bash
# 确保已安装 fnm
brew install fnm

# 配置 shell
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc

# 验证安装
fnm --version
```

#### 步骤 2: 创建图标(必需)

**方式 A - 使用在线工具(最简单)**

1. 访问 https://cloudconvert.com/svg-to-png
2. 上传 `assets/icon-template.svg`
3. 设置尺寸为 512x512
4. 下载并重命名为 `icon.png`
5. 放到 `assets/` 目录

**方式 B - 使用 ImageMagick**

```bash
brew install imagemagick
cd assets
convert icon-template.svg -resize 512x512 icon.png
```

**方式 C - 使用临时占位符**

```bash
# 使用任意 512x512 的 PNG 图片
cp /path/to/your/image.png assets/icon.png
```

#### 步骤 3: 安装依赖

```bash
cd /Users/gefangshuai/Documents/Dev/myspace/fnm-raycast
npm install
```

#### 步骤 4: 启动开发模式

```bash
npm run dev
```

这将在 Raycast 中加载扩展的开发版本。

#### 步骤 5: 在 Raycast 中使用

1. 打开 Raycast (⌘ + Space)
2. 搜索以下命令:
   - `List Node.js Versions`
   - `Install Node.js Version`
   - `Use Node.js Version`
   - `Uninstall Node.js Version`

---

### 方式二: 构建本地版本

如果您想要一个独立的构建版本:

#### 步骤 1: 构建扩展

```bash
npm run build
```

这将在 `dist/` 目录下生成构建文件。

#### 步骤 2: 在 Raycast 中导入

1. 打开 Raycast
2. 搜索 "Import Extension"
3. 选择 `dist/` 目录
4. 扩展将被导入到 Raycast

---

### 方式三: 发布到 Raycast Store(公开发布)

如果您想让所有 Raycast 用户都能使用这个扩展:

#### 前置要求

- [ ] GitHub 账号
- [ ] 扩展已在本地测试通过
- [ ] 图标已创建(`assets/icon.png`)
- [ ] 所有功能正常工作
- [ ] 代码通过 lint 检查

#### 步骤 1: 创建 GitHub 仓库

```bash
# 初始化 Git 仓库
cd /Users/gefangshuai/Documents/Dev/myspace/fnm-raycast
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: initial commit - FNM Raycast extension"

# 在 GitHub 上创建仓库,然后关联
git remote add origin https://github.com/YOUR_USERNAME/fnm-raycast.git
git branch -M main
git push -u origin main
```

#### 步骤 2: 准备发布

```bash
# 确保代码质量
npm run lint

# 如果有问题,自动修复
npm run fix-lint

# 构建扩展
npm run build
```

#### 步骤 3: 发布到 Raycast Store

```bash
npm run publish
```

这将启动发布流程:

1. **登录 Raycast 账号**
   - 如果首次发布,需要登录您的 Raycast 账号
   - 按照提示完成认证

2. **填写发布信息**
   - 扩展名称: FNM - Fast Node Manager
   - 描述: 已在 package.json 中配置
   - 分类: Developer Tools
   - 作者: gefangshuai

3. **审核流程**
   - Raycast 团队会审核您的扩展
   - 通常需要 1-3 个工作日
   - 审核通过后会自动发布到 Store

4. **发布成功**
   - 扩展将出现在 Raycast Store
   - 用户可以搜索并安装

#### 步骤 4: 更新扩展

当您需要更新扩展时:

```bash
# 1. 修改代码

# 2. 更新版本号(在 package.json 中)
# "version": "1.0.1"

# 3. 更新 CHANGELOG.md
# 记录更新内容

# 4. 提交到 Git
git add .
git commit -m "feat: add new feature"
git push

# 5. 重新发布
npm run publish
```

---

## 🔍 发布检查清单

在发布前,请确保:

### 必需项

- [ ] `assets/icon.png` 文件存在(512x512 像素)
- [ ] 所有功能已测试并正常工作
- [ ] 代码通过 `npm run lint` 检查
- [ ] `package.json` 中的信息正确
  - [ ] name
  - [ ] title
  - [ ] description
  - [ ] author
  - [ ] license
  - [ ] categories

### 推荐项

- [ ] README.md 完整且准确
- [ ] CHANGELOG.md 记录了版本历史
- [ ] 代码有适当的注释
- [ ] 错误处理完善
- [ ] 用户体验友好

---

## 📝 package.json 配置说明

关键配置项:

```json
{
  "name": "fnm",                              // 扩展唯一标识
  "title": "FNM - Fast Node Manager",         // 显示名称
  "description": "Manage Node.js versions...", // 描述
  "icon": "icon.png",                         // 图标路径
  "author": "gefangshuai",                    // 作者
  "categories": ["Developer Tools"],          // 分类
  "license": "MIT",                           // 许可证
  "commands": [...]                           // 命令列表
}
```

---

## 🚀 快速发布流程(总结)

### 本地测试

```bash
# 1. 创建图标
# 2. 安装依赖
npm install
# 3. 启动开发
npm run dev
# 4. 测试功能
```

### 发布到 Store

```bash
# 1. 初始化 Git
git init
git add .
git commit -m "feat: initial commit"

# 2. 推送到 GitHub
git remote add origin https://github.com/YOUR_USERNAME/fnm-raycast.git
git push -u origin main

# 3. 发布
npm run publish
```

---

## 🎯 不同场景的推荐方式

### 场景 1: 只想自己使用

→ **使用方式一(本地开发模式)**

- 运行 `npm run dev`
- 在 Raycast 中直接使用
- 不需要发布

### 场景 2: 团队内部使用

→ **使用方式二(构建本地版本)**

- 运行 `npm run build`
- 分享 `dist/` 目录给团队成员
- 团队成员通过 "Import Extension" 导入

### 场景 3: 公开分享给所有人

→ **使用方式三(发布到 Store)**

- 完成所有检查清单
- 运行 `npm run publish`
- 等待审核通过

---

## 🔧 常见问题

### Q1: 发布时提示缺少图标?

**A:** 确保 `assets/icon.png` 文件存在且为 512x512 像素。

### Q2: 如何更新已发布的扩展?

**A:**

1. 修改代码
2. 更新 `package.json` 中的版本号
3. 运行 `npm run publish`

### Q3: 发布需要多长时间?

**A:** 审核通常需要 1-3 个工作日。

### Q4: 可以撤回已发布的扩展吗?

**A:** 可以,在 Raycast 开发者后台操作。

### Q5: 本地开发模式会影响已安装的版本吗?

**A:** 不会,开发模式是独立的。

---

## 📚 相关资源

- [Raycast 扩展发布指南](https://developers.raycast.com/basics/publish-an-extension)
- [Raycast Store](https://www.raycast.com/store)
- [Raycast 开发者文档](https://developers.raycast.com)

---

## 💡 最佳实践

### 发布前

1. 在本地充分测试
2. 让朋友或同事试用
3. 收集反馈并改进
4. 确保文档完整

### 发布后

1. 监控用户反馈
2. 及时修复 bug
3. 定期更新功能
4. 维护文档

---

## 🎉 发布成功后

恭喜!您的扩展已发布。接下来可以:

- 📢 在社交媒体分享
- 📝 写一篇博客介绍
- 🎥 录制使用视频
- 💬 在社区讨论
- ⭐ 收集用户反馈

---

**祝您发布顺利!** 🚀

如有问题,欢迎查看文档或提交 issue。
