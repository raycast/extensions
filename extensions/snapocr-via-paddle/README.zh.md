# SnapOCR via Paddle

英文版说明见：[README.md](README.md)

SnapOCR 把 [Baidu PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 的文档解析工作流带进了 Raycast。

按照 PaddleOCR 自己的定位，它要做的不是简单把图片里的字抠出来，而是把 PDF 和图像文档转成更适合人和 AI 使用的结构化数据，例如 Markdown 和 JSON，并服务全球化、多语言的文档处理场景。SnapOCR 做的，就是把这套能力包装成一个轻量的桌面工作流，用来处理截图、PDF 和图片。

它不是普通的 OCR 包装壳。SnapOCR 基于 Paddle 的 `layout-parsing` API，会先理解页面结构，再识别标题、正文、表格、公式、图表和图片区域，最后输出可复用的 Markdown。因此，它的结果会比传统纯文本 OCR 更接近原始文档的层级和阅读逻辑。

## 面向全球用户的复杂文档识别

SnapOCR 不应该被写成“只针对中文”的 OCR 工具。底层 PaddleOCR 本身就是多语言文档理解引擎，它的文档解析能力面向的是复杂、真实世界的页面，而不是只针对单一语言或单一版式。

因此，SnapOCR 适合全球用户处理：

- 多语言文档和混合语言页面
- 论文、报告、手册、表单和长篇 PDF
- 表格、公式、图表等复杂元素密集出现的页面
- 截图、扫描页、导出的 PDF 和各类文档图片

## 为什么是 PaddleOCR

PaddleOCR 官方能力描述，正好就是这个扩展最核心的价值来源：

- **多语言覆盖广** - PaddleOCR 支持大规模多语言识别，适合全球用户而不是单一语言场景
- **复杂文档解析强** - PP-StructureV3 等能力重点增强了版面检测、表格识别、公式识别、图表理解和阅读顺序恢复
- **结构化输出强** - 它可以把复杂 PDF 和文档图片转成 Markdown、JSON 这类结构化结果，而不只是输出一段纯文本
- **服务化集成友好** - API 形态让高级文档解析能力可以自然接入 Raycast，而不要求本地部署模型

SnapOCR 的意义，就是把这些能力直接带进桌面工作流，而不要求用户安装本地 OCR 模型、原生依赖或命令行工具链。

## SnapOCR 的实际价值

- **版面感知 OCR，而不是扁平 OCR** - 先理解文档结构，再识别内容
- **多语言复杂文本识别** - 面向全球用户，适合不同语言和不同书写系统
- **表格和公式支持更强** - 这些能力属于核心场景，不是附带功能
- **结构化 Markdown 输出** - 更容易进入笔记、知识库、提示词、文档和 AI 工作流
- **API 驱动，扩展空间更大** - 它不是一个只会复制纯文本的本地 OCR 小工具
- **个人用户成本可接受** - 百度 AIStudio 的 PaddleOCR 免费额度通常足够个人日常使用

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

用 **Preview OCR**，适合论文页、表格页、公式页和复杂排版页这类你想先确认识别效果的场景。

### 3. 导出真正可落地的 Markdown 包

用 **Export OCR Markdown**，你会得到：

- 一个 `document.md`
- 一组配套导出的图片资源
- 更适合继续进入笔记、文档、提示词或 AI 工作流的结果

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
