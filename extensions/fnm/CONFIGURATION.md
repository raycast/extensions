# 配置指南

本文档说明如何配置 FNM Raycast 扩展。

## 📋 配置选项

扩展提供了以下配置选项,可以在 Raycast 扩展设置中进行配置。

### 1. FNM 路径 (fnmPath)

**用途**: 自定义 fnm 可执行文件的完整路径

**何时使用**:
- fnm 安装在非标准位置
- 自动检测失败
- 使用自定义编译的 fnm

**示例值**:
```
/opt/homebrew/bin/fnm
/usr/local/bin/fnm
/Users/username/custom/path/fnm
```

**留空**: 如果留空,扩展会自动在标准路径中查找 fnm

---

### 2. 额外的 PATH 路径 (customPaths)

**用途**: 添加额外的搜索路径,用于查找 fnm 和其他工具

**何时使用**:
- fnm 安装在自定义目录
- 需要添加多个搜索路径
- 使用非标准的包管理器

**格式**: 多个路径用冒号 `:` 分隔

**示例值**:
```
/custom/path/bin
/opt/custom/bin:/another/path/bin
/Users/username/.local/bin
```

**留空**: 如果留空,只使用默认的标准路径

---

## 🔧 如何配置

### 方式一: 通过 Raycast 界面

1. **打开 Raycast**
2. **搜索扩展命令** (如 "List Node.js Versions")
3. **按 `⌘ + ,`** 打开扩展设置
4. **填写配置项**:
   - FNM 路径: 输入 fnm 的完整路径
   - 额外的 PATH 路径: 输入额外的搜索路径
5. **保存** 并重新运行命令

### 方式二: 从错误提示打开设置

当扩展提示 "fnm 未找到" 时:

1. 在错误页面中
2. **按 Enter** 或点击 "打开扩展设置"
3. 配置 fnm 路径
4. 保存并重试

---

## 🔍 如何找到 fnm 路径

### 方法 1: 使用 which 命令

```bash
which fnm
```

输出示例:
```
/opt/homebrew/bin/fnm
```

将这个路径复制到 "FNM 路径" 配置中。

### 方法 2: 使用 whereis 命令

```bash
whereis fnm
```

### 方法 3: 手动查找

```bash
# 在常见位置查找
ls -la /opt/homebrew/bin/fnm
ls -la /usr/local/bin/fnm
ls -la ~/.fnm/fnm
```

---

## 📝 配置示例

### 示例 1: 标准 Homebrew 安装 (Apple Silicon)

```
FNM 路径: /opt/homebrew/bin/fnm
额外的 PATH 路径: (留空)
```

### 示例 2: 标准 Homebrew 安装 (Intel)

```
FNM 路径: /usr/local/bin/fnm
额外的 PATH 路径: (留空)
```

### 示例 3: 自定义安装位置

```
FNM 路径: /Users/username/.local/bin/fnm
额外的 PATH 路径: /Users/username/.local/bin
```

### 示例 4: 使用多个自定义路径

```
FNM 路径: (留空,让扩展自动查找)
额外的 PATH 路径: /opt/custom/bin:/Users/username/.local/bin
```

### 示例 5: 完全自定义

```
FNM 路径: /custom/location/fnm
额外的 PATH 路径: /custom/location:/another/path/bin
```

---

## 🎯 常见配置场景

### 场景 1: fnm 通过 Homebrew 安装

**不需要配置!** 扩展会自动找到。

如果自动检测失败,配置:
```
FNM 路径: /opt/homebrew/bin/fnm  (Apple Silicon)
或
FNM 路径: /usr/local/bin/fnm     (Intel)
```

---

### 场景 2: fnm 通过安装脚本安装

通常安装在 `~/.fnm/` 目录。

1. 找到 fnm 路径:
   ```bash
   which fnm
   ```

2. 配置扩展:
   ```
   FNM 路径: (which 命令的输出)
   ```

---

### 场景 3: fnm 在自定义位置

1. 确认 fnm 位置:
   ```bash
   find /Users -name fnm -type f 2>/dev/null
   ```

2. 配置完整路径:
   ```
   FNM 路径: /完整/路径/到/fnm
   额外的 PATH 路径: /完整/路径/到/bin目录
   ```

---

### 场景 4: 使用多个 Node 版本管理器

如果同时使用 nvm、fnm 等,确保配置正确的 fnm 路径:

```bash
# 找到 fnm 的确切位置
type fnm
```

---

## ✅ 验证配置

配置完成后,验证是否正确:

### 方法 1: 在扩展中测试

1. 打开 Raycast
2. 运行 "List Node.js Versions"
3. 应该能看到已安装的版本列表

### 方法 2: 在终端中验证

```bash
# 使用配置的路径测试
/opt/homebrew/bin/fnm --version

# 或使用配置的 PATH
export PATH="/custom/path:$PATH"
fnm --version
```

---

## 🐛 配置故障排除

### 问题 1: 配置后仍然提示 "fnm 未找到"

**检查**:
1. 路径是否正确(没有多余的空格)
2. 文件是否存在: `ls -la /your/path/to/fnm`
3. 文件是否可执行: `test -x /your/path/to/fnm && echo "OK"`

**解决**:
```bash
# 确认路径
which fnm

# 确认可执行
chmod +x /path/to/fnm
```

---

### 问题 2: 配置的路径不工作

**检查**:
1. 是否使用了相对路径(应使用绝对路径)
2. 是否包含 `~` (应展开为完整路径)
3. 路径中是否有特殊字符

**解决**:
```bash
# 获取完整路径(不含 ~)
realpath $(which fnm)
```

---

### 问题 3: 额外的 PATH 不生效

**检查**:
1. 路径之间是否用冒号 `:` 分隔
2. 路径是否存在
3. 是否有拼写错误

**示例**:
```
正确: /path1:/path2:/path3
错误: /path1,/path2,/path3  (使用了逗号)
错误: /path1; /path2         (使用了分号)
```

---

## 🔄 重置配置

如果配置出现问题,可以重置:

1. 打开扩展设置 (`⌘ + ,`)
2. 清空所有配置项
3. 保存
4. 扩展将使用默认的自动检测

---

## 💡 最佳实践

### 推荐配置策略

1. **首选**: 不配置,让扩展自动检测
2. **次选**: 只配置 "FNM 路径"
3. **最后**: 同时配置路径和额外的 PATH

### 配置原则

- ✅ 使用绝对路径
- ✅ 验证路径存在
- ✅ 保持配置简单
- ❌ 避免使用相对路径
- ❌ 避免使用 `~` 符号
- ❌ 避免配置不必要的路径

---

## 📖 相关文档

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除指南
- [INSTALL.md](INSTALL.md) - 安装指南
- [README.md](README.md) - 主文档

---

## 🆘 获取帮助

如果配置问题无法解决:

1. 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. 在 GitHub 提交 Issue,包含:
   - 您的配置
   - `which fnm` 的输出
   - `echo $PATH` 的输出
   - 错误截图

---

**最后更新**: 2026-01-08
