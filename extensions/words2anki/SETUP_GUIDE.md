# Raycast 扩展导入和配置指南

## 📦 导入扩展到 Raycast

### 步骤 1: 打开导入功能

1. 按 `Cmd + Space` 打开 Raycast
2. 输入 **"Import Extension"** 或 **"导入扩展"**
3. 选择这个命令

### 步骤 2: 选择项目目录

1. 在文件选择器中，导航到：`/Users/yu/Projects/words2anki`
2. 点击 **"Open"** 或 **"打开"**

### 步骤 3: 等待加载

- Raycast 会自动安装依赖（这可能需要几分钟）
- 你会看到一个进度指示器
- 完成后会显示成功消息

---

## ⚙️ 配置 DeepSeek API Key

导入成功后，配置 API Key：

### 方法 1: 通过扩展设置（推荐）

1. 在 Raycast 中搜索 **"Extensions"**
2. 找到 **"Words to Anki"** 扩展
3. 点击进入扩展详情页
4. 点击右上角的 **齿轮图标** ⚙️ 或按 `Cmd + ,`
5. 在 **"DeepSeek API Key"** 字段中粘贴你的 API Key

### 方法 2: 首次运行时配置

1. 选中一个单词
2. 触发 `ankicard` 命令
3. 如果没有配置 API Key，Raycast 会自动提示你输入
4. 输入你的 DeepSeek API Key

### 方法 3: 通过 Raycast 偏好设置

1. 打开 Raycast 偏好设置（`Cmd + ,`）
2. 点击左侧的 **"Extensions"** 标签
3. 找到 **"Words to Anki"**
4. 在右侧面板中配置所有参数

---

## 🔑 获取 DeepSeek API Key

如果你还没有 DeepSeek API Key：

1. 访问 https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 **"API Keys"** 页面
4. 点击 **"创建新密钥"**
5. 复制生成的密钥（格式：`sk-...`）

---

## 🔍 故障排除

### 问题 1: 找不到 "Import Extension" 命令

**解决方案**：
- 确认你使用的是最新版本的 Raycast
- 更新 Raycast：Raycast 偏好设置 → Advanced → Check for Updates

### 问题 2: 导入后看不到扩展

**解决方案**：
1. 打开 Raycast
2. 搜索 **"Manage Extensions"**
3. 检查 **"Words to Anki"** 是否在列表中
4. 如果在，确保它已启用（切换开关）

### 问题 3: 无法输入 API Key

**可能原因**：
- 扩展尚未完全加载
- Raycast 缓存问题

**解决方案**：
```bash
# 1. 重新加载扩展
# 在 Raycast 中搜索 "Reload Extensions"

# 2. 如果问题仍然存在，重启 Raycast
# 完全退出 Raycast（Raycast → Quit Raycast）
# 然后重新打开
```

### 问题 4: 扩展导入失败

**检查项**：
1. 确认 `package.json` 文件存在
2. 确认 `command-icon.png` 文件存在
3. 确认 `src/ankicard.tsx` 文件存在

**查看错误日志**：
```bash
# 在项目目录下运行（如果已安装 Node.js）
npm install
npm run dev
```

---

## ✅ 验证配置

配置完成后，测试扩展：

1. **准备 Anki**：
   - 启动 Anki
   - 确认 AnkiConnect 插件已安装并启用

2. **准备测试文本**：
   ```
   The diligent student studied every day.
   ```

3. **执行测试**：
   - 复制上面的句子（`Cmd + C`）
   - 选中单词 "diligent"
   - 打开 Raycast，输入 `ankicard`
   - 按回车

4. **预期结果**：
   - 看到进度提示
   - 几秒后显示成功消息
   - 在 Anki 中看到新卡片

---

## 📸 截图指南

如果配置界面与预期不符，可以截图并描述问题：

1. **扩展列表**：`Extensions` 页面的截图
2. **配置界面**：扩展设置页面的截图
3. **错误消息**：如果有错误提示，截图完整消息

---

## 🆘 仍然无法配置？

如果按照上述步骤仍然无法在偏好设置中填写 API Key，可能的替代方案：

### 临时方案：硬编码 API Key（仅用于测试）

修改 `src/ankicard.tsx`，在文件开头添加：

```typescript
const DEEPSEEK_API_KEY = "sk-your-api-key-here"; // 替换为你的实际 API Key
```

然后在代码中使用这个常量替代 `preferences.deepseekApiKey`。

**注意**：这只是临时测试方案，不建议长期使用。

---

## 📞 需要帮助？

请提供以下信息以便进一步诊断：

1. Raycast 版本号（Raycast → About Raycast）
2. macOS 版本
3. 导入扩展时的具体错误消息
4. 扩展是否出现在 Extensions 列表中
5. 配置界面的截图（如果可以打开）
