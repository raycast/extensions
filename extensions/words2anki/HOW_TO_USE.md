# 🚨 重要：Raycast 扩展加载方式说明

## 问题分析

Raycast 显示 "Could not find command's executable JS file" 错误的原因是：

**Raycast 期望的是已构建的 JS 文件，而项目中只有 TypeScript 源代码。**

## ✅ 解决方案

Raycast 扩展有两种使用方式：

### 方式 1：开发模式（推荐 - 无需手动构建）

**开发模式下，Raycast 会自动编译 TypeScript**，无需手动构建。

#### 使用步骤：

1. **确保扩展已从 Raycast 中移除**
   - Raycast → Preferences (`Cmd + ,`) → Extensions
   - 找到 "Words to Anki"（如果存在）
   - 右键 → Remove Extension

2. **使用命令行启动开发模式**：
   ```bash
   cd /Users/yu/Projects/words2anki
   /opt/homebrew/bin/npx @raycast/api@latest dev
   ```

3. **观察输出**：
   - 应该看到类似 "Development server started" 的消息
   - Raycast 会自动检测并加载扩展
   - 在 Raycast Extensions 列表中应该会出现 "Words to Anki"

4. **配置并使用**：
   - 扩展自动加载后，在 Raycast Extensions 中配置 API Key
   - 然后就可以使用 `ankicard` 命令了

5. **停止开发模式**：
   - 在终端按 `Ctrl + C` 停止开发服务器
   - 如果想继续使用，需要重新运行 `npx @raycast/api@latest dev`

---

### 方式 2：生产模式（需要手动发布）

这种方式需要通过 Raycast Store 发布，或者使用私有分发方式。

对于个人使用，**强烈推荐使用方式 1（开发模式）**。

---

## 📝 开发模式详细说明

### 什么是开发模式？

开发模式下：
- ✅ Raycast 自动编译 TypeScript → JavaScript
- ✅ 支持热重载（修改代码后自动更新）
- ✅ 可以看到详细的调试输出
- ✅ 无需手动构建

### 如何保持扩展运行？

**选项 A：终端保持开启**
```bash
cd /Users/yu/Projects/words2anki
/opt/homebrew/bin/npx @raycast/api@latest dev
```
保持这个终端窗口开启，扩展就会一直可用。

**选项 B：后台运行（使用 tmux 或 screen）**
```bash
# 安装 tmux（如果还没安装）
brew install tmux

# 启动 tmux 会话
tmux new -s raycast-dev

# 在 tmux 中运行开发服务器
cd /Users/yu/Projects/words2anki
/opt/homebrew/bin/npx @raycast/api@latest dev

# 分离 tmux 会话（按键）：Ctrl+B 然后按 D
# 扩展会在后台继续运行

# 重新连接到会话
tmux attach -t raycast-dev

# 停止会话
tmux kill-session -t raycast-dev
```

---

## 🎯 立即开始使用

### 快速启动脚本

我已经创建了一个启动脚本，运行即可：

```bash
cd /Users/yu/Projects/words2anki
chmod +x dev-start.sh
./dev-start.sh
```

或者直接运行：

```bash
cd /Users/yu/Projects/words2anki
/opt/homebrew/bin/npx @raycast/api@latest dev
```

---

## ❓ 常见问题

### Q: 每次重启电脑都要运行这个命令吗？

A: 是的，开发模式下需要保持开发服务器运行。你可以：
- 每次使用时启动（最简单）
- 使用 tmux 在后台运行（推荐）
- 使用 LaunchAgent 自动启动（高级）

### Q: 能不能不用开发模式？

A: 可以，但需要发布到 Raycast Store 或使用私有分发。对于个人使用，开发模式是最简单的方式。

### Q: 开发模式下修改代码需要重启吗？

A: 不需要！开发模式支持热重载。修改代码保存后，Raycast 会自动重新加载扩展。

---

## 🚀 下一步

1. **关闭之前导入的扩展**（如果有）
2. **运行开发模式**：`cd /Users/yu/Projects/words2anki && /opt/homebrew/bin/npx @raycast/api@latest dev`
3. **配置 API Key**
4. **开始使用！**

开发服务器运行时，你会看到类似这样的输出：
```
✓ Development server is ready
✓ Watching for changes...
```

现在 Raycast 应该能正确加载扩展了！
