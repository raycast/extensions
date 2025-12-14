# 🔧 修复完成 - 重新加载扩展

## ✅ 已修复的问题

1. ✓ 在 `package.json` 中添加了 `script` 属性指向源文件
2. ✓ 确认 Node.js 已安装（v25.2.1）
3. ✓ 成功安装了所有依赖包（255 packages）

---

## 🔄 下一步：重新加载扩展

### 方法 1：在 Raycast 中重新加载（推荐）

1. **打开 Raycast**（`Cmd + Space`）
2. **搜索并运行**：`Reload Extension`
3. **选择**：Words to Anki
4. **等待**：几秒钟让 Raycast 重新编译

### 方法 2：移除后重新导入

1. **打开 Raycast 偏好设置**（`Cmd + ,`）
2. **进入 Extensions 标签**
3. **找到 Words to Anki**
4. **右键** → **Remove Extension**
5. **重新导入**：
   - 搜索 `Import Extension`
   - 选择 `/Users/yu/Projects/words2anki`

---

## 📝 配置 API Key

重新加载后，你应该能看到配置选项了：

### 进入扩展设置

```
Raycast → Extensions → Words to Anki → 右上角齿轮图标 ⚙️
```

### 填写以下信息

| 字段                 | 说明 | 示例                    |
| -------------------- | ---- | ----------------------- |
| **DeepSeek API Key** | 必填 | `sk-...`                |
| **Anki Deck Name**   | 可选 | `Default`               |
| **AnkiConnect URL**  | 可选 | `http://localhost:8765` |
| **Anki Note Type**   | 可选 | `Basic`                 |

---

## 🧪 测试扩展

配置完成后，进行测试：

1. **启动 Anki**（确保 AnkiConnect 已安装）

2. **复制测试文本**：
   ```
   The resilient entrepreneur persevered through countless setbacks.
   ```

3. **选中生词**：`resilient`

4. **触发命令**：
   - 打开 Raycast
   - 输入 `ankicard`
   - 回车

5. **检查结果**：
   - 应该看到进度提示
   - 成功后显示确认消息
   - 在 Anki 中查看新卡片

---

## ❓ 如果还是不行

### 查看扩展日志

```
Raycast → Extensions → Words to Anki → 右键 → View Logs
```

### 在开发模式下运行

```bash
cd /Users/yu/Projects/words2anki
/opt/homebrew/bin/npm run dev
```

这会在开发模式下启动扩展，你可以看到详细的调试信息。

---

## 📸 成功的标志

重新加载后，你应该能：

✅ 在 Extensions 列表中看到 "Words to Anki" 且无错误标记
✅ 点击扩展后能看到配置界面
✅ 能够填写 DeepSeek API Key
✅ 运行 `ankicard` 命令时不再出现 "Could not find command's executable JS file" 错误

---

## 🎉 准备就绪！

修复已完成，现在请：
1. 在 Raycast 中重新加载扩展
2. 配置你的 DeepSeek API Key
3. 开始使用吧！
