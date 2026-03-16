# SnapOCR via Paddle

英文版说明见：[README.md](README.md)

SnapOCR 可以把截图、PDF 和图片直接变成结构化 Markdown，并且底层用的不是普通 OCR，而是[百度 PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 的 `layout-parsing` 接口。也就是说，它会先理解页面结构，再识别标题、正文、表格、公式和图片区域，最终输出更接近原文逻辑的 Markdown。

这让它特别适合处理通用 OCR 经常做坏的内容：复杂中文文本、中文手写体、竖排文字、学术论文页面、密集表格、公式较多的文档，以及各种混合版式材料。你拿到的不再是一团扁平纯文本，而是更接近原始排版层次的结果。

## 为什么它值得强调

- **不是简单 OCR，而是复杂中文文档识别** - SnapOCR 面向的不是干净英文段落，而是中文优先的真实文档场景，包括手写体、竖排文本、混合中英页面和复杂排版。
- **表格和公式是核心亮点，不是附带能力** - 借助 Paddle 的版面解析，SnapOCR 可以更好地处理表格、公式和密集页面区域，而不是把它们压扁成一行行乱码。
- **API 驱动，能力上限更高** - 这不是一个只会“截图转纯文本”的本地小工具。因为底层走的是百度 PaddleOCR API，所以它可以继续扩展到 PDF、Markdown bundle 导出以及更复杂的文档解析流程。
- **结构化 Markdown 输出** - 标题、列表、段落、表格和图片资源都可以以更易复用的形式保留下来。
- **个人用户成本可接受** - 百度 AIStudio 提供 PaddleOCR 免费额度，通常足够个人日常使用。

## 为什么选百度 PaddleOCR

PaddleOCR 本身就是很强的中文 OCR 与文档理解方案，而 SnapOCR 恰好把这些优势带进了 Raycast：

- **中文识别能力强**，更适合中文手写体、竖排文字和混合语言页面
- **版面解析能力强**，能区分标题、正文、表格、公式等语义区域
- **文档增强能力完整**，支持方向校正、畸变矫正等恢复手段
- **API 形态易集成**，让复杂 OCR 能以很轻量的方式进入 Raycast 工作流

换句话说，SnapOCR 的价值不只是“接了个 OCR”，而是把百度 PaddleOCR 真正擅长的那部分文档理解能力带到了 Raycast。

## 它在 Raycast 里的不同之处

Raycast 里很多 OCR 相关工作流更偏向“截图后提取纯文本”。SnapOCR 的定位不同，它从一开始就面向复杂文档和结构化输出。

这意味着：

- 复杂中文页面不是边缘场景，而是主要场景
- 表格和公式不是可有可无，而是核心能力
- 由于底层直接接了 API，后续还能继续扩展更复杂的解析能力

## 命令

| Command                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| **Quick OCR**           | 截图识别后立即复制结构化文字结果                      |
| **Preview OCR**         | 截图识别后先在 Raycast 中预览结构化 OCR 结果          |
| **Export OCR Markdown** | 选择 PDF 或图片文件，导出带图片资源的 Markdown bundle |

## 你可以怎么用

### 1. 快速处理截图中的复杂文本

用 **Quick OCR**，适合最快把截图里的内容变成可复用文字。

### 2. 先看结果，再复制

用 **Preview OCR**，适合论文页、公式页、复杂排版页这类你想先确认识别效果的场景。

### 3. 导出真正可落地的 Markdown 包

用 **Export OCR Markdown**，你会得到：

- 一个 `document.md`
- 一组配套导出的图片资源
- 更适合继续进入笔记、文档、提示词或知识库的结果

## OCR 能力

### 结构化 Markdown

因为 SnapOCR 走的是 Paddle 的版面解析接口，所以输出会比普通 OCR 更接近原始结构：

- 标题仍然是标题
- 正文仍然是正文
- 表格尽量回到结构化形式
- 公式更不容易被压扁成噪声
- 导出时还能保留图片资源

### 可选增强能力

在偏好设置中开启这些选项后，可以更稳地处理真实世界文档：

- **Document Orientation Classify** - 自动识别并纠正文档旋转方向
- **Document Unwarping** - 修正弯曲或倾斜页面的透视畸变
- **Chart Recognition** - 从图表、表格和图示中提取结构化内容
- **Fast Mode** - 对大图先压缩并跳过较慢增强流程，换取更快响应

## 配置

你需要一个免费的[百度 AIStudio](https://aistudio.baidu.com) 账号来获取 API 凭据。OCR 服务由百度 AIStudio 上的 PaddleOCR 平台提供。

百度 AIStudio 也提供 PaddleOCR 免费额度，通常足够个人使用。具体额度可能会调整，请以官方页面当时显示的信息为准。

### 1. 获取 API URL 和 Access Token

1. 访问 [https://aistudio.baidu.com/paddleocr](https://aistudio.baidu.com/paddleocr)
2. 登录百度账号
3. 点击页面上的 **"API"** 按钮
4. 复制：
   - `API_URL` - 基础 URL，例如 `https://xxx.aistudio-app.com`，不含 `/layout-parsing`
   - `TOKEN` - access token 字符串

### 2. 配置扩展

打开 Raycast，搜索任一命令，然后填写：

| 设置             | 值                                                          |
| ---------------- | ----------------------------------------------------------- |
| **Access Token** | 第 1 步中的 `TOKEN` 值                                      |
| **API URL**      | `API_URL` 中的基础 URL，例如 `https://xxx.aistudio-app.com` |
