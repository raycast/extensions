# SnapOCR via Paddle

Turn any screenshot into clean, structured Markdown with [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR). SnapOCR is a Raycast OCR workflow built for Chinese-first recognition: handwriting, vertical text, tables, formulas, and dense document layouts that generic OCR often flattens or misses.

把任意截图快速变成干净、可复制的结构化 Markdown。SnapOCR 是一个面向中文优先场景的 Raycast OCR 工作流，尤其适合手写体、竖排文字、表格、公式和复杂版面，这是通用 OCR 经常识别不准或直接丢失结构的地方。

Powered by the PaddleOCR-VL model through [Baidu AIStudio](https://aistudio.baidu.com/paddleocr), SnapOCR gives you stronger OCR without local models, native dependencies, or command-line setup. Bring your own free AIStudio account, take a screenshot, and get usable output in seconds.

文字识别由 PaddleOCR-VL 模型提供支持，通过[百度 AIStudio](https://aistudio.baidu.com/paddleocr) 云端 API 调用。无需本地模型、无需原生依赖，也不用折腾命令行环境；只要准备一个免费的 AIStudio 账号，截一张图，几秒内就能拿到真正可用的结果。

## Why It Stands Out | 为什么更值得用

- **Chinese-first OCR | 中文场景优先** — Built for Chinese handwriting, vertical text, and mixed-layout documents, not just clean Latin text. / 针对中文手写体、竖排文字和混合版面优化，而不是只擅长干净的拉丁文字。
- **Structured output | 输出保留结构** — Export headings, lists, tables, and formulas as readable Markdown instead of a flat text dump. / 标题、列表、表格、公式都会尽量保留结构，不再只是杂乱文本堆叠。
- **Two capture flows | 两种截图流程** — Send OCR straight to the clipboard or review it first in a Raycast detail view. / 既可以一键识别后直接复制，也可以先在 Raycast 里预览再决定复制内容。
- **Zero local OCR setup | 无需本地 OCR 环境** — No local model download or native OCR dependency. The heavy lifting happens in the cloud. / 不用下载本地模型，也不用安装本地 OCR 依赖，复杂识别交给云端处理。

## Commands | 命令

| Command | Description |
|---------|-------------|
| **Quick OCR** | Capture a screenshot and instantly copy structured OCR text / 截图识别后立即复制结构化文字结果 |
| **Preview OCR** | Capture a screenshot and review the OCR result in Raycast before copying / 截图识别后先在 Raycast 中预览，再决定复制内容 |

## Features | 功能特性

### Advanced OCR Capabilities | 复杂文档 OCR 能力

PaddleOCR-VL goes beyond basic text extraction. Enable optional features in extension preferences when you need better recovery from messy real-world documents:

PaddleOCR-VL 不只是把图片里的字抠出来。在扩展偏好设置中启用这些可选能力后，可以更稳地处理真实世界里的复杂文档：

- **Document Orientation Classify | 文档方向分类** — Automatically detects and corrects documents rotated at 0°/90°/180°/270°. Perfect for photos of documents taken at odd angles. / 自动检测并矫正 0°/90°/180°/270° 旋转的文档，适合拍摄角度不正的文档照片。
- **Document Unwarping | 文档畸变矫正** — Corrects perspective distortion from curved or tilted documents. Great for book pages, receipts, and whiteboard photos. / 矫正弯曲或倾斜文档的透视畸变，适用于书页、收据和白板照片。
- **Chart Recognition | 图表识别** — Extracts structured data from charts, tables, and diagrams, converting them into readable text and Markdown tables. / 从图表、表格和图示中提取结构化数据，转换为可读文本和 Markdown 表格。

### Markdown-Formatted Output | Markdown 格式化输出

SnapOCR is designed to produce output you can paste directly into notes, docs, prompts, or knowledge bases:

SnapOCR 的目标不是给你一段难以复用的纯文本，而是尽可能输出可以直接粘贴进笔记、文档、提示词或知识库的内容：

- Headings, lists, and paragraphs maintain their hierarchy / 标题、列表和段落保持层级关系
- Tables are converted to Markdown table format / 表格转换为 Markdown 表格格式
- Mathematical formulas are preserved / 数学公式得以保留
- Copy as plain text or Markdown from the Preview OCR view / 在预览视图中可复制纯文本或 Markdown

## Why SnapOCR over Local OCR? | 为什么选择 SnapOCR？

| Feature / 功能 | SnapOCR via Paddle | macOS Vision (ScreenOCR) |
|---------|------------------------------|--------------------------|
| Chinese handwritten text / 中文手写体 | Excellent / 优秀 | Limited / 有限 |
| Vertical Chinese text / 竖排中文 | Excellent / 优秀 | Limited / 有限 |
| Document layout parsing / 文档版面解析 | Tables, formulas, charts / 表格、公式、图表 | Text only / 仅文本 |
| Output format / 输出格式 | Structured Markdown / 结构化 Markdown | Plain text / 纯文本 |
| Orientation correction / 方向矫正 | Built-in / 内置 | Manual / 手动 |
| Perspective unwarping / 畸变矫正 | Built-in / 内置 | Not available / 不支持 |
| Privacy / 隐私 | Cloud API / 云端 API | Local processing / 本地处理 |
| Internet required / 需要联网 | Yes / 是 | No / 否 |

## Setup | 配置

You need a free [Baidu AIStudio](https://aistudio.baidu.com) account to get the API credentials. The API is provided by Baidu's AIStudio platform.

你需要一个免费的[百度 AIStudio](https://aistudio.baidu.com) 账号来获取 API 凭据。API 由百度 AIStudio 平台提供。

### 1. Get API URL and Access Token | 获取 API URL 和 Access Token

1. Visit / 访问 [https://aistudio.baidu.com/paddleocr](https://aistudio.baidu.com/paddleocr)
2. Log in with your Baidu account (sign up if needed) / 登录百度账号（如需注册请先注册）
3. Click the **"API"** button on the page / 点击页面上的 **"API"** 按钮
4. In the example code, find / 在示例代码中找到：
   - `API_URL` — copy the base URL part (e.g. `https://xxx.aistudio-app.com`, without `/layout-parsing`) / 复制基础 URL 部分（如 `https://xxx.aistudio-app.com`，不含 `/layout-parsing`）
   - `TOKEN` — copy the token string / 复制 token 字符串

### 2. Configure the Extension | 配置扩展

Open Raycast → search "Quick OCR" or "Preview OCR" → you'll be prompted to enter:

打开 Raycast → 搜索 "Quick OCR" 或 "Preview OCR" → 系统会提示你输入：

| Setting / 设置 | Value / 值 |
|---------|-------|
| **Access Token** | The `TOKEN` value from step 1 / 第 1 步中的 `TOKEN` 值 |
| **API URL** | The base URL from `API_URL` (e.g. `https://xxx.aistudio-app.com`) / `API_URL` 中的基础 URL |
