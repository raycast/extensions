# 发布准备指南

为了将此插件发布到 Raycast Store，我们需要准备一些视觉素材。

## 1. 图标 (Icon)

我已经为您生成了一个临时的极简图标（红白双色拼接），位于 `assets/icon.png`。
如果您有更好的设计，请直接替换该文件。
- **要求**: 512x512 像素, PNG 格式。
- **建议**: 简洁、在深色和浅色模式下都清晰可见。

## 2. 截图 (Screenshots)

Raycast Store 需要展示插件实际运行效果的截图。请将截图放入 `metadata` 文件夹中。

### 截图规范
- **格式**: PNG
- **尺寸**: 建议使用 Raycast 默认窗口大小。
- **文件名**: `raycast-bilingual-formatter-1.png`, `raycast-bilingual-formatter-2.png` 等。
- **内容**: 
    - 至少包含一张 `Format Text` 表单界面的截图。
    - 如果可能，展示一张操作后的 Toast 提示截图（例如 "格式化完成"）。

### 如何截图 (推荐步骤)
1. 打开 Raycast。
2. 输入 "Format Text" 进入命令界面。
3. 在文本框中输入一些示例文本（例如：`在Raycast上,写作体验very good!`）。
4. 按 `Cmd + Shift + 4`，然后按 `Space`（空格键），点击 Raycast 窗口进行完美窗口截图。
   - *注意*: 默认 macOS 窗口截图带有阴影，这对 Raycast Store 也是可以接受的，但最好是在纯色背景上截图。
5. 将截图重命名为 `raycast-bilingual-formatter-1.png` 并放入 `metadata/` 文件夹。

## 3. 提交发布

一切准备就绪后：
1. Fork [raycast/extensions](https://github.com/raycast/extensions) 仓库。
2. 将本项目代码复制到 extensions 仓库的 `extensions/bilingual-formatter` 目录下。
3. 提交 Pull Request。
