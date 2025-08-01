# 文件链接点击测试指南

## 测试步骤

1. **准备测试文件**：
   - 在您的SiYuan工作空间的assets目录中放置一个测试文件（例如：test.pdf）
   - 或者创建一个包含文件链接的SiYuan笔记

2. **配置工作空间路径**：
   - 在Raycast扩展设置中配置正确的工作空间路径
   - 例如：`/Users/yourname/Documents/SiYuan`

3. **测试直接点击**：
   - 在Raycast中搜索包含文件链接的笔记
   - 查看笔记详情
   - 文件链接现在会显示为：`[文件名 📎](file://完整路径)`
   - **直接点击这些链接**尝试打开文件

4. **测试ActionPanel备用方式**：
   - 如果直接点击不工作，使用ActionPanel中的文件打开选项
   - 快捷键：Cmd+Alt+数字

## 预期行为

### 成功情况：
- 直接点击文件链接会用系统默认程序打开文件
- 文件链接在Markdown中会显示文件图标（📎）
- ActionPanel提供多种打开方式作为备选

### 调试信息：
- 打开开发者控制台查看调试日志
- 日志会显示：
  - `[DEBUG] processLocalFileLinks - Processing link`
  - `[DEBUG] Converting link: 原始路径`
  - `[DEBUG] -> file protocol: file://绝对路径`

## 测试用例

假设您的SiYuan笔记中有这样的链接：
```markdown
查看[我的文档](assets/document-20240101-abc123.pdf)
```

处理后会变成：
```markdown
查看[我的文档 📎](file:///Users/yourname/Documents/SiYuan/data/assets/document-20240101-abc123.pdf)
```

点击链接应该会用默认的PDF阅读器打开该文件。

## 故障排除

如果链接无法直接点击打开：
1. 确认工作空间路径配置正确
2. 检查文件是否真实存在
3. 使用ActionPanel中的"在Finder中显示"功能验证文件位置
4. 尝试使用ActionPanel中的其他打开选项

这种实现方式提供了最大的兼容性和用户体验！