# SnapOCR via Paddle

英文版说明见：[README.md](README.md)

把任意截图快速变成干净、可复制的结构化 Markdown。SnapOCR 是一个基于 Paddle `layout-parsing` 接口的 Raycast OCR 工作流，不是那种“先 OCR 出一坨文字，再自己想办法分块”的方案。它会先理解页面结构，再按标题、正文、表格、公式等版面区域逐块识别，这正是通用 OCR 经常识别不准或直接丢失结构的地方。

文字识别由 PaddleOCR-VL 模型提供支持，通过[百度 AIStudio](https://aistudio.baidu.com/paddleocr) 云端 API 调用。无需本地模型、无需原生依赖，也不用折腾命令行环境；只要准备一个免费的百度 AIStudio 账号，截一张图，几秒内就能拿到真正可用的结果。

## 为什么更值得用

- **不只是 OCR，更是版面理解** - SnapOCR 依赖 Paddle 的版面分析能力，先判断每个区域是什么，再去识别内容；这比“先整体 OCR，再回头猜结构”的传统流程聪明得多。
- **中文场景优先** - 针对中文手写体、竖排文字和混合版面优化，而不是只擅长干净的拉丁文字。
- **输出保留结构** - 标题、列表、表格、公式都会尽量保留结构，不再只是杂乱文本堆叠。
- **两种截图流程** - 既可以一键识别后直接复制，也可以先在 Raycast 里预览再决定复制内容。
- **无需本地 OCR 环境** - 不用下载本地模型，也不用安装本地 OCR 依赖，复杂识别交给云端处理。

## 为什么 Layout Analysis 很关键

传统 OCR 往往是更简单的流程：先把文字识别出来，再把“哪里是标题、哪里是表格、哪里是正文”这个问题丢回给用户自己处理。

SnapOCR 走的是 Paddle 的版面解析接口。也就是说，它先分析整页结构，识别语义区域，再输出带结构的 Markdown。

- 标题仍然是标题
- 正文仍然是正文
- 表格能回到 Markdown 表格
- 公式更不容易被压扁成乱码

## 命令

| Command | Description |
|---------|-------------|
| **Quick OCR** | 截图识别后立即复制结构化文字结果 |
| **Preview OCR** | 截图识别后先在 Raycast 中预览，再决定复制内容 |

## 功能特性

### 复杂文档 OCR 能力

PaddleOCR-VL 不只是把图片里的字抠出来。在扩展偏好设置中启用这些可选能力后，可以更稳地处理真实世界里的复杂文档：

- **Document Orientation Classify** - 自动检测并矫正 0°/90°/180°/270° 旋转的文档，适合拍摄角度不正的文档照片。
- **Document Unwarping** - 矫正弯曲或倾斜文档的透视畸变，适用于书页、收据和白板照片。
- **Chart Recognition** - 从图表、表格和图示中提取结构化数据，转换为可读文本和 Markdown 表格。

### Markdown 格式化输出

SnapOCR 的目标不是给你一段难以复用的纯文本，而是尽可能输出可以直接粘贴进笔记、文档、提示词或知识库的内容。由于它先做版面分析，再组织结果，最终得到的 Markdown 通常比纯 OCR 输出更接近原始页面结构：

- 标题、列表和段落保持层级关系
- 表格转换为 Markdown 表格格式
- 数学公式得以保留
- 在预览视图中可复制纯文本或 Markdown

## 为什么选择 SnapOCR？

| 功能 | SnapOCR via Paddle | macOS Vision (ScreenOCR) |
|---------|------------------------------|--------------------------|
| 先做版面理解 | 是 | 否 |
| 中文手写体 | 优秀 | 有限 |
| 竖排中文 | 优秀 | 有限 |
| 文档版面解析 | 表格、公式、图表 | 仅文本 |
| 输出格式 | 结构化 Markdown | 纯文本 |
| 方向矫正 | 内置 | 手动 |
| 畸变矫正 | 内置 | 不支持 |
| 隐私 | 云端 API | 本地处理 |
| 需要联网 | 是 | 否 |

## 配置

你需要一个免费的[百度 AIStudio](https://aistudio.baidu.com) 账号来获取 API 凭据。API 由百度 AIStudio 平台提供。

百度 AIStudio 也提供 PaddleOCR 的免费额度，通常足够覆盖个人日常截图 OCR 使用。具体额度和计费细则请以官方 PaddleOCR 页面当时显示的信息为准。

### 1. 获取 API URL 和 Access Token

1. 访问 [https://aistudio.baidu.com/paddleocr](https://aistudio.baidu.com/paddleocr)
2. 登录百度账号
3. 点击页面上的 **"API"** 按钮
4. 在示例代码中找到：
   - `API_URL` - 复制基础 URL 部分，例如 `https://xxx.aistudio-app.com`，不含 `/layout-parsing`
   - `TOKEN` - 复制 token 字符串

### 2. 配置扩展

打开 Raycast，搜索 "Quick OCR" 或 "Preview OCR"，系统会提示你输入：

| 设置 | 值 |
|---------|-------|
| **Access Token** | 第 1 步中的 `TOKEN` 值 |
| **API URL** | `API_URL` 中的基础 URL，例如 `https://xxx.aistudio-app.com` |
