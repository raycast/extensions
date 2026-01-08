# 安装指南

## 前置要求

### 1. 安装 fnm

在使用此扩展之前,您需要先安装 fnm (Fast Node Manager)。

#### macOS

使用 Homebrew 安装(推荐):

```bash
brew install fnm
```

或使用安装脚本:

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

#### Linux

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

#### Windows

使用 Scoop:

```powershell
scoop install fnm
```

或使用 Chocolatey:

```powershell
choco install fnm
```

或使用 Winget:

```powershell
winget install Schniz.fnm
```

### 2. 配置 Shell

安装完成后,需要在您的 shell 配置文件中添加 fnm 的初始化代码。

#### Zsh (macOS 默认)

编辑 `~/.zshrc`:

```bash
# 添加以下行
eval "$(fnm env --use-on-cd)"
```

然后重新加载配置:

```bash
source ~/.zshrc
```

#### Bash

编辑 `~/.bashrc` 或 `~/.bash_profile`:

```bash
# 添加以下行
eval "$(fnm env --use-on-cd)"
```

然后重新加载配置:

```bash
source ~/.bashrc
```

#### Fish

编辑 `~/.config/fish/config.fish`:

```fish
# 添加以下行
fnm env --use-on-cd | source
```

然后重新加载配置:

```fish
source ~/.config/fish/config.fish
```

#### PowerShell (Windows)

编辑 PowerShell 配置文件:

```powershell
# 添加以下行
fnm env --use-on-cd | Out-String | Invoke-Expression
```

### 3. 验证安装

重启终端后,运行以下命令验证 fnm 是否正确安装:

```bash
fnm --version
```

如果显示版本号,说明安装成功!

## 安装 Raycast 扩展

### 方式一: 从 Raycast Store 安装(推荐)

1. 打开 Raycast
2. 搜索 "Store"
3. 在 Store 中搜索 "FNM" 或 "Fast Node Manager"
4. 点击 "Install" 安装

### 方式二: 本地开发安装

1. **克隆或下载此项目**

   ```bash
   git clone <repository-url>
   cd fnm-raycast
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **准备图标**

   在 `assets/` 目录下放置一个名为 `icon.png` 的图标文件(512x512 像素)。

4. **启动开发模式**

   ```bash
   npm run dev
   ```

   这将在 Raycast 中加载扩展的开发版本。

5. **构建扩展**

   ```bash
   npm run build
   ```

## 首次使用

1. 打开 Raycast (⌘ + Space 或您设置的快捷键)
2. 输入 "fnm" 或 "node"
3. 您会看到以下命令:
   - **List Node.js Versions** - 列出已安装的版本
   - **Install Node.js Version** - 安装新版本
   - **Use Node.js Version** - 切换版本
   - **Uninstall Node.js Version** - 卸载版本

## 常见问题

### fnm 命令未找到

如果扩展提示找不到 fnm,请检查:

1. fnm 是否已正确安装
2. Shell 配置文件中是否添加了 fnm 初始化代码
3. 是否重启了终端或重新加载了配置文件
4. 运行 `which fnm` 检查 fnm 是否在 PATH 中

### 版本切换后不生效

fnm 的版本切换是基于 shell 会话的:

- 新打开的终端会话会使用新版本
- 已存在的终端会话需要手动运行 `fnm use <version>` 或重启
- 建议设置默认版本: `fnm default <version>`

### 权限问题

如果遇到权限问题,请确保:

1. fnm 安装目录有正确的权限
2. 不要使用 `sudo` 运行 fnm 命令
3. Node.js 版本安装在用户目录下

## 获取帮助

如果您遇到问题:

1. 查看 [README.md](README.md) 中的常见问题部分
2. 查看 [fnm 官方文档](https://github.com/Schniz/fnm)
3. 在 GitHub 上提交 issue

## 卸载

如果您想卸载此扩展:

1. 打开 Raycast
2. 搜索 "Extensions"
3. 找到 "FNM - Fast Node Manager"
4. 点击 "Uninstall"

如果您也想卸载 fnm:

```bash
# macOS (Homebrew)
brew uninstall fnm

# 或删除 fnm 目录
rm -rf ~/.fnm
```

然后从 shell 配置文件中删除 fnm 初始化代码。
