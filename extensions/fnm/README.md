# FNM - Fast Node Manager

一个用于管理 Node.js 版本的 Raycast 扩展,基于 [fnm](https://github.com/Schniz/fnm) (Fast Node Manager)。

## 功能特性

- 📋 **列出已安装版本** - 查看所有已安装的 Node.js 版本,包括当前使用的版本和默认版本
- 📥 **安装新版本** - 快速安装 Node.js 的任意版本(支持 LTS、latest 或指定版本号)
- 🔄 **切换版本** - 在不同的 Node.js 版本之间快速切换
- 🗑️ **卸载版本** - 删除不再需要的 Node.js 版本

## 前置要求

在使用此扩展之前,您需要先安装 fnm:

### macOS / Linux

```bash
# 使用 Homebrew (推荐)
brew install fnm

# 或使用安装脚本
curl -fsSL https://fnm.vercel.app/install | bash
```

### 配置 Shell

安装完成后,需要在您的 shell 配置文件中添加 fnm 的初始化代码:

**Zsh (~/.zshrc)**

```bash
eval "$(fnm env --use-on-cd)"
```

**Bash (~/.bashrc)**

```bash
eval "$(fnm env --use-on-cd)"
```

**Fish (~/.config/fish/config.fish)**

```fish
fnm env --use-on-cd | source
```

## 安装扩展

### 方式一: 快速安装(推荐)

使用提供的安装脚本:

```bash
cd /Users/gefangshuai/Documents/Dev/myspace/fnm-raycast
./setup.sh
```

脚本会自动:

- 检查 fnm 是否安装
- 检查图标文件
- 安装依赖
- 启动开发模式

### 方式二: 手动安装

1. **创建图标**(必需)

   ```bash
   # 访问 https://cloudconvert.com/svg-to-png
   # 上传 assets/icon-template.svg
   # 设置尺寸为 512x512
   # 下载并重命名为 icon.png
   # 放到 assets/ 目录
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **启动开发模式**
   ```bash
   npm run dev
   ```

### 方式三: 从 Raycast Store 安装(待发布)

扩展发布后,可以直接从 Raycast Store 搜索 "FNM" 安装。

## 使用方法

### 列出已安装的版本

1. 打开 Raycast
2. 输入 `List Node.js Versions`
3. 查看所有已安装的版本,当前使用的版本会用绿色标记
4. 可以直接从列表中切换版本或设置默认版本

### 安装新版本

1. 打开 Raycast
2. 输入 `Install Node.js Version`
3. 选择以下方式之一:
   - 安装 LTS 版本(推荐)
   - 安装最新版本
   - 输入自定义版本号(如 18.17.0)
   - 从可用版本列表中选择

### 切换版本

1. 打开 Raycast
2. 输入 `Use Node.js Version`
3. 从已安装的版本列表中选择要使用的版本

### 卸载版本

1. 打开 Raycast
2. 输入 `Uninstall Node.js Version`
3. 选择要卸载的版本
4. 确认卸载操作

## 快捷键

- `⌘ + R` - 刷新列表
- `⌘ + D` - 设置为默认版本(在列表视图中)
- `⌘ + ,` - 打开扩展设置

## 配置选项

扩展提供了灵活的配置选项,可以在 Raycast 扩展设置中配置:

### FNM 路径

自定义 fnm 可执行文件的完整路径。如果 fnm 安装在非标准位置,或自动检测失败时使用。

**示例**:

- `/opt/homebrew/bin/fnm` (Apple Silicon Mac)
- `/usr/local/bin/fnm` (Intel Mac)
- `/Users/username/.local/bin/fnm` (自定义位置)

**如何配置**:

1. 在任意命令中按 `⌘ + ,` 打开设置
2. 填写 "FNM 路径"
3. 保存并重新运行命令

### 额外的 PATH 路径

添加额外的搜索路径,多个路径用冒号 `:` 分隔。

**示例**: `/custom/path/bin:/another/path/bin`

详细配置说明请查看 [CONFIGURATION.md](CONFIGURATION.md)

## 常见问题

### fnm 命令未找到

如果扩展提示找不到 fnm,请确保:

1. fnm 已正确安装
2. 已在 shell 配置文件中添加 fnm 初始化代码
3. 重启终端或重新加载配置文件

### 版本切换后不生效

fnm 的版本切换是基于当前 shell 会话的。在 Raycast 中切换版本后:

- 新打开的终端会话会使用新版本
- 已存在的终端会话需要重新运行 `fnm use <version>` 或重启

## 关于 fnm

fnm (Fast Node Manager) 是一个快速简单的 Node.js 版本管理器,使用 Rust 编写。相比其他版本管理器,fnm 具有以下优势:

- 🚀 **快速** - 使用 Rust 编写,性能优异
- 🎯 **简单** - API 简洁,易于使用
- 🔄 **自动切换** - 支持基于 `.node-version` 或 `.nvmrc` 文件自动切换版本
- 🌍 **跨平台** - 支持 macOS、Linux 和 Windows

## 发布扩展

如果您想将扩展发布到 Raycast Store 供所有人使用:

### 快速发布流程

1. **准备 Git 仓库**

   ```bash
   git init
   git add .
   git commit -m "feat: initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/fnm-raycast.git
   git push -u origin main
   ```

2. **发布到 Store**

   ```bash
   npm run publish
   ```

3. **等待审核**
   - Raycast 团队会审核您的扩展
   - 通常需要 1-3 个工作日
   - 审核通过后自动发布

详细发布指南请查看 [PUBLISH_GUIDE.md](PUBLISH_GUIDE.md)

## 开发命令

```bash
npm install        # 安装依赖
npm run dev        # 开发模式
npm run build      # 构建扩展
npm run lint       # 代码检查
npm run fix-lint   # 自动修复
npm run publish    # 发布到 Raycast Store
```

## 项目文档

- [QUICKSTART.md](QUICKSTART.md) - 5分钟快速开始
- [INSTALL.md](INSTALL.md) - 详细安装指南
- [CONFIGURATION.md](CONFIGURATION.md) - 配置指南 ⚙️
- [PUBLISH_GUIDE.md](PUBLISH_GUIDE.md) - 发布和安装指南
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除指南 ⭐
- [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献代码指南
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目技术总结
- [NEXT_STEPS.md](NEXT_STEPS.md) - 下一步操作指南

## 许可证

MIT

## 相关链接

- [fnm GitHub 仓库](https://github.com/Schniz/fnm)
- [Raycast 扩展开发文档](https://developers.raycast.com)
- [Raycast Store](https://www.raycast.com/store)
