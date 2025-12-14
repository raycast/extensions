# ✅ 扩展已构建成功 - 完整重新导入指南

## 🎯 当前状态

✓ 扩展已成功构建
✓ TypeScript 已编译为 JavaScript
✓ 所有依赖已安装
✓ package.json 配置正确

---

## 🔄 完全重新导入扩展（必须执行）

由于 Raycast 可能缓存了旧的扩展状态，需要**完全移除并重新导入**：

### 步骤 1: 完全移除现有扩展

1. **打开 Raycast 偏好设置**
   - 按 `Cmd + ,` 或
   - Raycast → Settings

2. **进入 Extensions 标签**
   - 点击左侧的 "Extensions"

3. **找到并移除 Words to Anki**
   - 在列表中找到 "Words to Anki"
   - **右键点击** → 选择 **"Remove Extension"**
   - 确认删除

### 步骤 2: 清除 Raycast 缓存（可选但推荐）

1. **完全退出 Raycast**
   - Raycast → Quit Raycast
   - 或按 `Cmd + Q`

2. **重新启动 Raycast**
   - 从 Applications 文件夹或 Spotlight 打开

### 步骤 3: 重新导入扩展

1. **打开 Raycast** (`Cmd + Space`)

2. **搜索并运行 "Import Extension"**
   - 输入 `Import Extension`
   - 回车

3. **选择项目目录**
   - 导航到：`/Users/yu/Projects/words2anki`
   - 点击 "Open" 或 "打开"

4. **等待 Raycast 处理**
   - Raycast 会检测到已构建的扩展
   - 应该很快完成（因为已经构建好了）
   - 看到成功消息

---

## ⚙️ 配置 API Key

导入成功后（这次应该没有错误了）：

### 方法 1: 通过扩展详情页

1. 在 Raycast 中搜索 **"Extensions"**
2. 找到 **"Words to Anki"**
3. 点击扩展名称进入详情页
4. 点击右上角的 **齿轮图标 ⚙️**
5. 填写配置：
   - **DeepSeek API Key**: `sk-...` （必填）
   - **Anki Deck Name**: `Default` （可选）
   - **AnkiConnect URL**: `http://localhost:8765` （可选）
   - **Anki Note Type**: `Basic` （可选）

### 方法 2: 通过偏好设置

1. `Cmd + ,` 打开 Raycast 偏好设置
2. 左侧点击 **Extensions**
3. 找到 **Words to Anki**
4. 在右侧面板配置参数

---

## 🧪 测试扩展

配置完成后立即测试：

1. **启动 Anki**（确保 AnkiConnect 已安装）

2. **复制测试句子**：
   ```
   The eloquent speaker captivated the audience.
   ```

3. **选中单词**: `eloquent`

4. **运行命令**:
   - 打开 Raycast
   - 输入 `Create Anki Card` 或 `ankicard`
   - 回车

5. **观察结果**:
   - ✅ 应该显示进度提示："Creating Anki Card..."
   - ✅ 然后显示："Generating definition with AI..."
   - ✅ 最后显示成功消息
   - ✅ 在 Anki 中能看到新卡片

---

## ❌ 如果还是显示同样的错误

如果仍然看到 "Could not find command's executable JS file"，执行以下操作：

### 方案 A: 重新构建扩展

```bash
cd /Users/yu/Projects/words2anki

# 清理之前的构建（如果存在）
rm -rf dist/

# 重新构建
/opt/homebrew/bin/npx @raycast/api@latest build
```

然后重复上面的"完全重新导入"步骤。

### 方案 B: 使用开发模式

如果构建版本有问题，可以尝试开发模式：

```bash
cd /Users/yu/Projects/words2anki
/opt/homebrew/bin/npx @raycast/api@latest dev
```

这会在开发模式下启动扩展，Raycast 会自动检测并加载。

---

## 📸 成功的标志

重新导入后，你应该看到：

✅ 扩展列表中的 "Words to Anki" **没有任何错误图标**
✅ 点击扩展能看到详细信息和配置选项
✅ 能够正常填写 DeepSeek API Key
✅ 运行 `ankicard` 命令时**不再出现错误**

---

## 🆘 仍然有问题？

如果按照上述步骤操作后仍然有问题，请提供：

1. **Raycast 版本**（Raycast → About）
2. **扩展列表截图**（Extensions 页面）
3. **错误消息完整截图**
4. **终端执行以下命令的输出**：
   ```bash
   cd /Users/yu/Projects/words2anki
   ls -la
   ls -la dist/ 2>&1 || echo "No dist folder"
   ```

---

## 💡 关键提示

**关键点**: Raycast 有时会缓存扩展状态。**完全移除后重新导入**是解决此类问题的最可靠方法。

现在扩展已经正确构建，重新导入应该就能正常工作了！🚀
