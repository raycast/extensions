# SnapOCR via Paddle

Snap a screenshot and recognize text via [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) API, optimized for Chinese text including handwritten and vertical layouts.

截图识别文字，基于 [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) API，针对中文手写体和竖排文字进行优化。

Text recognition is powered by PaddleOCR-VL model via [Baidu AIStudio](https://aistudio.baidu.com/paddleocr) cloud API. No local dependencies required — just a free Baidu AIStudio account.

文字识别由 PaddleOCR-VL 模型提供支持，通过[百度 AIStudio](https://aistudio.baidu.com/paddleocr) 云端 API 调用，无需安装本地依赖——只需一个免费的百度 AIStudio 账号。

## Commands | 命令

| Command | Description |
|---------|-------------|
| **Quick OCR** | Take a screenshot and copy recognized text to clipboard / 截图识别并复制到剪贴板 |
| **Preview OCR** | Take a screenshot and preview recognized text in a detail view / 截图识别并在预览窗口中查看 |

## Features | 功能特性

### Advanced OCR Capabilities | 高级 OCR 能力

PaddleOCR-VL goes beyond simple text extraction. Enable optional features in extension preferences to handle complex documents:

PaddleOCR-VL 不仅仅是简单的文字提取。在扩展偏好设置中启用可选功能，即可处理复杂文档：

- **Document Orientation Classify | 文档方向分类** — Automatically detects and corrects documents rotated at 0°/90°/180°/270°. Perfect for photos of documents taken at odd angles. / 自动检测并矫正 0°/90°/180°/270° 旋转的文档，适合拍摄角度不正的文档照片。
- **Document Unwarping | 文档畸变矫正** — Corrects perspective distortion from curved or tilted documents. Great for book pages, receipts, and whiteboard photos. / 矫正弯曲或倾斜文档的透视畸变，适用于书页、收据和白板照片。
- **Chart Recognition | 图表识别** — Extracts structured data from charts, tables, and diagrams, converting them into readable text and Markdown tables. / 从图表、表格和图示中提取结构化数据，转换为可读文本和 Markdown 表格。

### Markdown-Formatted Output | Markdown 格式化输出

Unlike plain-text OCR, SnapOCR preserves document structure in the output:

与纯文本 OCR 不同，SnapOCR 在输出中保留文档结构：

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
