# 📸 AI Provider Switch - 截图生成指南

## 快速开始

### 准备工作
1. 确保 Raycast 版本 >= 1.37.0
2. 在 Raycast 中打开 "Manage AI Providers" 命令
3. 进入 Raycast Preferences → Advanced
4. 启用 "Window Capture" 并设置快捷键（例如：⌘⇧⌥+M）

### 截图列表 (需要 6 张)

#### 📌 截图 1: 提供商列表 (Main Screen)
- **目的**: 展示主界面和提供商管理功能
- **操作流程**:
  1. 运行 "Manage AI Providers" 命令
  2. 确保列表中显示至少 2-3 个提供商
  3. 按快捷键 (⌘⇧⌥+M)
  4. ✅ 勾选 "Save to Metadata"
- **关键要素**: 清晰的提供商列表、快捷键提示

#### 📌 截图 2: 添加提供商表单
- **目的**: 展示创建新提供商的流程
- **操作流程**:
  1. 在提供商列表中按 `Cmd+N`
  2. 填入示例数据:
     - Provider ID: `example-ai`
     - Display Name: `Example AI Provider`
     - Base URL: `https://api.example.com`
  3. 显示 API Keys 部分
  4. 按快捷键进行截图
  5. ✅ 勾选 "Save to Metadata"
- **关键要素**: 表单字段清晰、API Key 输入字段

#### 📌 截图 3: 模型列表
- **目的**: 展示特定提供商的模型列表
- **操作流程**:
  1. 返回提供商列表
  2. 按 `Enter` 选择某个提供商
  3. 显示该提供商的模型列表（显示 3-4 个模型）
  4. 按快捷键进行截图
  5. ✅ 勾选 "Save to Metadata"
- **关键要素**: 模型列表、快捷键指示

#### 📌 截图 4: 添加模型表单
- **目的**: 展示创建和配置模型的功能
- **操作流程**:
  1. 在模型列表中按 `Cmd+N`
  2. 填入示例数据:
     - Model ID: `example-model-large`
     - Display Name: `Example Model Large`
     - Context Window: `128000`
  3. 显示 Ability Template 选择（选择 "Full" 或 "Basic"）
  4. 按快捷键进行截图
  5. ✅ 勾选 "Save to Metadata"
- **关键要素**: 模型配置表单、能力模板、上下文窗口

#### 📌 截图 5: 远程模型导入
- **目的**: 展示从 OpenAI-compatible 端点导入模型的功能
- **操作流程**:
  1. 返回到模型列表
  2. 按 `Cmd+R` 导入远程模型
  3. 显示远程模型导入对话框（可能显示加载或模型列表）
  4. 按快捷键进行截图
  5. ✅ 勾选 "Save to Metadata"
- **关键要素**: 导入对话框、模型选择、导入按钮

#### 📌 截图 6: 提供商编辑 / API Key 管理
- **目的**: 展示高级功能如 API Key 管理和图标选择
- **操作流程**:
  1. 从列表中选择一个提供商
  2. 按 `Cmd+Shift+E` 编辑提供商
  3. 显示包含 API Keys 和图标选择的表单
  4. 或者展示其他重要功能（如禁用状态、模型编辑等）
  5. 按快捷键进行截图
  6. ✅ 勾选 "Save to Metadata"
- **关键要素**: API Key 管理、图标预设、高级设置

## 📋 截图规格

| 要求 | 规范 |
|------|------|
| 格式 | PNG |
| 尺寸 | 2000 x 1250 pixels (16:10 宽屏) |
| 主题 | 保持一致（建议深色背景） |
| 数量 | 3-6 张（推荐 6 张） |
| 数据 | 示例数据（不包含真实 API Keys） |

## 🎨 背景和风格建议

### 背景选择
1. **推荐**: 使用 Raycast 官方壁纸
   - 链接: https://www.raycast.com/wallpapers
   - 选择高对比度的壁纸
   - 保持所有截图背景一致

2. **对比度**: 确保 Raycast 窗口和背景有足够对比度
3. **主题**: 选择浅色或深色主题，但全部使用同一种

### 去除干扰
- ❌ 不要包含其他应用窗口
- ❌ 不要显示真实的 API Keys
- ❌ 不要显示个人信息
- ✅ 使用示例或虚拟数据

## ⚠️ 常见错误

| 错误 | 说明 | 修复 |
|------|------|------|
| 混用主题 | 有些截图浅色，有些深色 | 全部使用同一主题 |
| 真实数据 | 显示真实 API Keys | 使用示例数据 |
| 其他应用 | 截图中包含其他应用 | 最小化其他应用 |
| 截图不清晰 | 文字模糊或对比度差 | 选择更高对比度背景 |
| 未勾选保存 | 忘记勾选 "Save to Metadata" | 每张都必须勾选 |

## 🔍 验证截图

### 检查步骤
```bash
# 进入项目目录
cd /Users/wyong/devtool/raycast/extension/ai-provider-switch

# 查看已保存的截图数量
find media/screenshots -name "*.png" | wc -l

# 列出所有截图
find media/screenshots -name "*.png" | sort
```

### 预期输出
```
6
media/screenshots/1.png
media/screenshots/2.png
media/screenshots/3.png
media/screenshots/4.png
media/screenshots/5.png
media/screenshots/6.png
```

## 🚀 发布流程

当所有 6 张截图都已保存后：

```bash
# 验证所有系统检查都通过
npm run build
npm run lint

# 发布到官方商店
npm run publish

# 按照 GitHub 认证提示完成登录
# 等待 Raycast 团队审核 (1-5 个工作日)
```

## 💡 提示和技巧

1. **使用测试数据**: 创建虚拟的提供商和模型来演示功能
2. **展示关键功能**: 确保每张截图都展示扩展的不同方面
3. **清晰的布局**: 让用户一眼看出扩展的用途
4. **保持一致**: 所有截图使用相同的风格和背景
5. **质量优先**: 宁可花时间拍摄高质量截图，也不要草率应付

## 📞 遇到问题

- **截图未保存**: 确保勾选了 "Save to Metadata"
- **快捷键无效**: 检查 Raycast Preferences 中是否启用了 Window Capture
- **背景显示不正确**: 确保 Raycast 窗口最大化，背景清晰可见
- **其他问题**: 参考 https://developers.raycast.com/basics/prepare-an-extension-for-store

## 完成后

✅ 所有截图完成后，运行：
```bash
npm run publish
```

🎉 你的扩展将被提交到 Raycast 官方商店审核！
