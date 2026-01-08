# 快速开始指南

## 5 分钟上手 FNM Raycast 扩展

### 第一步: 安装 fnm

**macOS 用户 (推荐使用 Homebrew):**

```bash
brew install fnm
```

**配置 Zsh (macOS 默认 shell):**

```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```

### 第二步: 验证安装

```bash
fnm --version
```

如果显示版本号,说明安装成功!

### 第三步: 安装 Node.js

使用 fnm 安装您的第一个 Node.js 版本:

```bash
# 安装 LTS 版本(推荐)
fnm install --lts

# 或安装最新版本
fnm install latest

# 或安装特定版本
fnm install 18.17.0
```

### 第四步: 设置默认版本

```bash
fnm default lts-latest
```

### 第五步: 开发此扩展

1. **克隆项目**
   ```bash
   cd /Users/gefangshuai/Documents/Dev/myspace/fnm-raycast
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **创建图标** (必需)
   
   您需要创建一个 512x512 的 PNG 图标:
   
   ```bash
   # 方式 1: 使用提供的 SVG 模板转换
   cd assets
   # 然后使用在线工具或 ImageMagick 转换 icon-template.svg 为 icon.png
   
   # 方式 2: 使用任意 512x512 的 PNG 图片作为临时占位符
   # 将图片重命名为 icon.png 并放到 assets/ 目录
   ```

4. **启动开发模式**
   ```bash
   npm run dev
   ```

   这将在 Raycast 中加载扩展。

### 第六步: 使用扩展

1. 打开 Raycast (⌘ + Space)
2. 输入以下命令之一:
   - `List Node.js Versions` - 查看已安装的版本
   - `Install Node.js Version` - 安装新版本
   - `Use Node.js Version` - 切换版本
   - `Uninstall Node.js Version` - 卸载版本

## 常用操作

### 安装 Node.js 版本

1. 打开 Raycast
2. 输入 `Install Node.js Version`
3. 选择:
   - **Install Latest LTS** (推荐新手)
   - **Install Latest** (最新稳定版)
   - **Install Custom Version** (输入版本号)

### 切换 Node.js 版本

1. 打开 Raycast
2. 输入 `Use Node.js Version`
3. 从列表中选择要使用的版本
4. 按 Enter 确认

### 查看当前版本

1. 打开 Raycast
2. 输入 `List Node.js Versions`
3. 当前使用的版本会显示绿色的 "current" 标签

## 快捷键

- `⌘ + R` - 刷新列表
- `⌘ + D` - 设置为默认版本

## 下一步

- 阅读完整的 [README.md](README.md)
- 查看 [INSTALL.md](INSTALL.md) 了解详细安装说明
- 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何贡献代码

## 遇到问题?

### fnm 命令未找到

```bash
# 检查 fnm 是否安装
which fnm

# 如果未找到,重新安装
brew install fnm

# 确保已添加到 shell 配置
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```

### 扩展无法加载

1. 确保已运行 `npm install`
2. 确保 `assets/icon.png` 文件存在
3. 重新运行 `npm run dev`

### 版本切换不生效

- 关闭并重新打开终端
- 或在终端中运行 `fnm use <version>`

## 获取帮助

- GitHub Issues: 提交问题和建议
- fnm 文档: https://github.com/Schniz/fnm
- Raycast 文档: https://developers.raycast.com
