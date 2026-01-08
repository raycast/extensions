# 快速配置参考

## 🚨 遇到 "fnm 未找到" 错误?

### 方案 1: 配置 fnm 路径(推荐)

1. **找到 fnm 路径**:
   ```bash
   which fnm
   ```
   
   输出示例: `/opt/homebrew/bin/fnm`

2. **在 Raycast 中配置**:
   - 打开任意 FNM 命令
   - 按 `⌘ + ,` 打开设置
   - 在 "FNM 路径" 中填入上面的路径
   - 保存

3. **完成!** 重新运行命令即可

---

### 方案 2: 安装 fnm

如果还没有安装 fnm:

```bash
# macOS (推荐)
brew install fnm

# 配置 shell
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc

# 验证
fnm --version
```

---

## 📍 常见 fnm 路径

| 系统/安装方式 | 路径 |
|--------------|------|
| Apple Silicon Mac (Homebrew) | `/opt/homebrew/bin/fnm` |
| Intel Mac (Homebrew) | `/usr/local/bin/fnm` |
| 安装脚本 | `~/.fnm/fnm` 或 `~/.local/share/fnm/fnm` |
| 自定义 | 运行 `which fnm` 查看 |

---

## ⚙️ 配置选项速查

### FNM 路径
```
用途: 指定 fnm 可执行文件的完整路径
示例: /opt/homebrew/bin/fnm
何时用: fnm 在非标准位置或自动检测失败
```

### 额外的 PATH 路径
```
用途: 添加额外的搜索路径
示例: /custom/bin:/another/bin
格式: 多个路径用冒号 : 分隔
何时用: fnm 在自定义目录
```

---

## 🔍 诊断命令

```bash
# 1. 检查 fnm 是否安装
which fnm

# 2. 检查 fnm 版本
fnm --version

# 3. 检查 fnm 是否可执行
test -x $(which fnm) && echo "OK" || echo "Not executable"

# 4. 列出已安装的 Node.js 版本
fnm list

# 5. 检查当前 PATH
echo $PATH | tr ':' '\n'
```

---

## 💡 快速解决方案

### 情况 1: fnm 已安装但扩展找不到

**解决**: 在扩展设置中配置 fnm 完整路径

```bash
# 获取路径
which fnm

# 复制输出,填入扩展设置的 "FNM 路径"
```

---

### 情况 2: fnm 未安装

**解决**: 安装 fnm

```bash
brew install fnm
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```

---

### 情况 3: fnm 在自定义位置

**解决**: 配置完整路径和额外的 PATH

```bash
# 找到 fnm
find ~ -name fnm -type f 2>/dev/null

# 在扩展设置中填写:
# FNM 路径: /完整/路径/到/fnm
# 额外的 PATH: /完整/路径/到/bin目录
```

---

## 📱 打开扩展设置的方法

1. **方法 1**: 在任意 FNM 命令中按 `⌘ + ,`
2. **方法 2**: 在错误提示页面按 Enter
3. **方法 3**: Raycast → Extensions → FNM → 点击设置图标

---

## ✅ 验证配置

配置后运行:

```
Raycast → "List Node.js Versions"
```

应该能看到已安装的版本列表,不再报错。

---

## 📚 详细文档

- [CONFIGURATION.md](CONFIGURATION.md) - 完整配置指南
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除
- [INSTALL.md](INSTALL.md) - 安装说明

---

**需要帮助?** 查看完整的 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
