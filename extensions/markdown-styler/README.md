# Raycast Markdown Styler

一个 Raycast 扩展，帮助你将 Markdown 文本转换为适合微信公众号的富文本格式。

## 功能

- 一键将 Markdown 文本转换为微信公众号兼容格式
- 现代简约风格的排版
- 支持所有常用 Markdown 元素：标题、列表、代码块、引用、表格等
- 自动复制功能，无需手动操作

## 使用方法

1. 在任何应用中选择 Markdown 文本
2. 触发 Raycast 并运行 "Style Markdown" 命令
3. 点击 "在浏览器中打开并复制" 按钮
4. 在打开的浏览器中点击 "复制内容" 按钮
5. 将复制的内容粘贴到微信公众号编辑器中

如果自动复制不成功，您也可以手动选择内容：

- 点击格式化好的内容区域
- 按下 Cmd+A 全选内容
- 按下 Cmd+C 复制内容

## 开发

本扩展使用 TypeScript 和 React 构建，基于 Raycast 扩展 API。

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

## 许可

MIT
