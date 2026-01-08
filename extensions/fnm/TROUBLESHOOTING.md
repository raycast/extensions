# 故障排除指南

本文档帮助您解决使用 FNM Raycast 扩展时可能遇到的常见问题。

## 🔧 常见问题

### 1. "fnm not found" 错误

**问题**: 扩展提示找不到 fnm 命令。

**原因**: 
- fnm 未安装
- fnm 未添加到 PATH
- Shell 配置未正确设置

**解决方案**:

#### 步骤 1: 检查 fnm 是否已安装

```bash
which fnm
```

如果返回路径(如 `/opt/homebrew/bin/fnm`),说明已安装。
如果提示 "not found",需要先安装:

```bash
# macOS (推荐使用 Homebrew)
brew install fnm

# 或使用安装脚本
curl -fsSL https://fnm.vercel.app/install | bash
```

#### 步骤 2: 配置 Shell

安装后,需要在 shell 配置文件中添加 fnm 初始化代码:

**Zsh (macOS 默认)**
```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```

**Bash**
```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.bashrc
source ~/.bashrc
```

**Fish**
```bash
echo 'fnm env --use-on-cd | source' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish
```

#### 步骤 3: 验证安装

```bash
fnm --version
```

应该显示 fnm 的版本号。

#### 步骤 4: 重启 Raycast

关闭并重新打开 Raycast,或运行:

```bash
# 重启 Raycast 扩展开发模式
npm run dev
```

---

### 2. 扩展无法加载

**问题**: 在 Raycast 中找不到扩展。

**解决方案**:

1. **检查图标文件**
   ```bash
   ls -la assets/icon.png
   ```
   确保 `assets/icon.png` 存在且为 512x512 像素。

2. **重新安装依赖**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **重新启动开发模式**
   ```bash
   npm run dev
   ```

4. **检查是否有错误**
   在终端中查看是否有错误信息。

---

### 3. 版本切换后不生效

**问题**: 在 Raycast 中切换版本后,终端中的 Node.js 版本没有改变。

**原因**: fnm 的版本切换是基于 shell 会话的。

**解决方案**:

1. **设置默认版本**
   ```bash
   fnm default <version>
   ```
   这样新打开的终端会自动使用该版本。

2. **在现有终端中切换**
   ```bash
   fnm use <version>
   ```

3. **重启终端**
   关闭并重新打开终端窗口。

---

### 4. 安装版本失败

**问题**: 安装 Node.js 版本时失败。

**解决方案**:

1. **检查网络连接**
   确保可以访问 Node.js 下载服务器。

2. **检查磁盘空间**
   ```bash
   df -h
   ```

3. **手动安装**
   ```bash
   fnm install <version>
   ```
   在终端中查看详细错误信息。

4. **清理缓存**
   ```bash
   rm -rf ~/.fnm/node-versions/.downloads
   ```

---

### 5. 无法卸载版本

**问题**: 卸载版本时提示失败。

**解决方案**:

1. **检查是否为当前版本**
   不能卸载正在使用的版本。先切换到其他版本:
   ```bash
   fnm use <other-version>
   ```

2. **手动删除**
   ```bash
   rm -rf ~/.fnm/node-versions/v<version>
   ```

---

### 6. 扩展运行缓慢

**问题**: 扩展响应很慢。

**解决方案**:

1. **检查 fnm 性能**
   ```bash
   time fnm list
   ```

2. **减少已安装版本**
   卸载不需要的版本以提高性能。

3. **重启 Raycast**
   完全退出并重新打开 Raycast。

---

### 7. 权限问题

**问题**: 提示权限不足。

**解决方案**:

1. **检查 fnm 目录权限**
   ```bash
   ls -la ~/.fnm
   ```

2. **修复权限**
   ```bash
   chmod -R u+w ~/.fnm
   ```

3. **不要使用 sudo**
   fnm 应该在用户权限下运行,不要使用 `sudo`。

---

### 8. 找不到已安装的版本

**问题**: 明明安装了版本,但扩展中看不到。

**解决方案**:

1. **刷新列表**
   在扩展中按 `⌘ + R` 刷新。

2. **验证安装**
   ```bash
   fnm list
   ```

3. **检查 fnm 目录**
   ```bash
   ls ~/.fnm/node-versions/
   ```

---

## 🐛 调试技巧

### 启用详细日志

在代码中添加 `console.log()` 查看详细信息:

```typescript
console.log("fnm output:", stdout);
```

### 查看 Raycast 开发者工具

在扩展中按 `⌘ + ⌥ + I` 打开开发者工具,查看控制台输出。

### 手动测试 fnm 命令

在终端中手动运行 fnm 命令,查看是否有错误:

```bash
fnm list
fnm install 18
fnm use 18
```

---

## 📋 环境检查清单

运行以下命令检查环境:

```bash
# 1. 检查 fnm 安装
which fnm
fnm --version

# 2. 检查 fnm 配置
echo $FNM_DIR
ls -la ~/.fnm

# 3. 检查已安装版本
fnm list

# 4. 检查当前版本
fnm current

# 5. 检查 Node.js
node --version
npm --version

# 6. 检查 PATH
echo $PATH | tr ':' '\n' | grep fnm
```

---

## 🆘 获取帮助

如果以上方法都无法解决问题:

1. **查看 fnm 文档**
   https://github.com/Schniz/fnm

2. **查看 Raycast 文档**
   https://developers.raycast.com

3. **提交 Issue**
   在 GitHub 上提交问题,包含:
   - 错误信息
   - 系统信息 (`uname -a`)
   - fnm 版本 (`fnm --version`)
   - 重现步骤

4. **检查已知问题**
   查看项目的 Issues 页面,可能已有解决方案。

---

## 💡 最佳实践

### 推荐配置

1. **使用 LTS 版本**
   ```bash
   fnm install --lts
   fnm default lts-latest
   ```

2. **定期更新 fnm**
   ```bash
   brew upgrade fnm  # macOS
   ```

3. **清理旧版本**
   定期卸载不再使用的 Node.js 版本。

4. **使用 .nvmrc 文件**
   在项目中创建 `.nvmrc` 文件,fnm 会自动切换版本:
   ```bash
   echo "18.17.0" > .nvmrc
   ```

---

## 🔄 重置扩展

如果一切都不行,尝试完全重置:

```bash
# 1. 停止开发模式 (Ctrl+C)

# 2. 清理依赖
rm -rf node_modules package-lock.json

# 3. 重新安装
npm install

# 4. 重新启动
npm run dev
```

---

## 📞 联系支持

- **GitHub Issues**: 提交问题和建议
- **文档**: 查看 README.md 和其他文档
- **社区**: Raycast Discord 社区

---

**最后更新**: 2026-01-08
