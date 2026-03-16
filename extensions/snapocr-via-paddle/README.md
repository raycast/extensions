# SnapOCR via Paddle

Chinese version: [README.zh.md](README.zh.md)

Turn any screenshot into clean, structured Markdown with [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR). SnapOCR is a Raycast OCR workflow built around Paddle's `layout-parsing` API, so it is not doing "plain OCR first, structure later". It first understands the page layout, then recognizes the content block by block: titles, paragraphs, tables, formulas, and other dense document regions that generic OCR often flattens or misses.

Powered by the PaddleOCR-VL model through [Baidu AIStudio](https://aistudio.baidu.com/paddleocr), SnapOCR gives you stronger OCR without local models, native dependencies, or command-line setup. Bring your own free Baidu AIStudio account, take a screenshot, and get usable output in seconds.

## Why It Stands Out

- **Layout-aware, not just OCR** - SnapOCR uses Paddle's layout analysis pipeline to understand what each region is before recognition, which is much smarter than flattening all text first and trying to reconstruct structure afterward.
- **Chinese-first OCR** - Built for Chinese handwriting, vertical text, and mixed-layout documents, not just clean Latin text.
- **Structured output** - Export headings, lists, tables, and formulas as readable Markdown instead of a flat text dump.
- **Two capture flows** - Send OCR straight to the clipboard or review it first in a Raycast detail view.
- **Zero local OCR setup** - No local model download or native OCR dependency. The heavy lifting happens in the cloud.

## Why Layout Analysis Matters

Traditional OCR usually follows a simpler pipeline: detect text, recognize text, then leave you to manually reconstruct where the headings, tables, and paragraphs were.

SnapOCR uses Paddle's layout parsing endpoint instead. That means the model analyzes the page structure first, identifies semantic regions, and only then outputs Markdown with the structure preserved.

- Headings stay headings
- Paragraphs stay paragraphs
- Tables come back as Markdown tables
- Formulas are less likely to be flattened into noise

## Commands

| Command | Description |
|---------|-------------|
| **Quick OCR** | Capture a screenshot and instantly copy structured OCR text |
| **Preview OCR** | Capture a screenshot and review the OCR result in Raycast before copying |

## Features

### Advanced OCR Capabilities

PaddleOCR-VL goes beyond basic text extraction. Enable optional features in extension preferences when you need better recovery from messy real-world documents:

- **Document Orientation Classify** - Automatically detects and corrects documents rotated at 0°/90°/180°/270°. Perfect for photos of documents taken at odd angles.
- **Document Unwarping** - Corrects perspective distortion from curved or tilted documents. Great for book pages, receipts, and whiteboard photos.
- **Chart Recognition** - Extracts structured data from charts, tables, and diagrams, converting them into readable text and Markdown tables.

### Markdown-Formatted Output

SnapOCR is designed to produce output you can paste directly into notes, docs, prompts, or knowledge bases. Because layout analysis happens first, the Markdown is usually much closer to the original page structure than plain OCR output:

- Headings, lists, and paragraphs maintain their hierarchy
- Tables are converted to Markdown table format
- Mathematical formulas are preserved
- Copy as plain text or Markdown from the Preview OCR view

## Why SnapOCR over Local OCR?

| Feature | SnapOCR via Paddle | macOS Vision (ScreenOCR) |
|---------|------------------------------|--------------------------|
| Layout analysis first | Yes | No |
| Chinese handwritten text | Excellent | Limited |
| Vertical Chinese text | Excellent | Limited |
| Document layout parsing | Tables, formulas, charts | Text only |
| Output format | Structured Markdown | Plain text |
| Orientation correction | Built-in | Manual |
| Perspective unwarping | Built-in | Not available |
| Privacy | Cloud API | Local processing |
| Internet required | Yes | No |

## Setup

You need a free [Baidu AIStudio](https://aistudio.baidu.com) account to get the API credentials. The API is provided by Baidu's AIStudio platform.

Baidu AIStudio also offers a free allowance for PaddleOCR, which is usually enough for personal day-to-day screenshot OCR usage. Check the official PaddleOCR page for the current quota and pricing details.

### 1. Get API URL and Access Token

1. Visit [https://aistudio.baidu.com/paddleocr](https://aistudio.baidu.com/paddleocr)
2. Log in with your Baidu account
3. Click the **"API"** button on the page
4. In the example code, find:
   - `API_URL` - copy the base URL part, for example `https://xxx.aistudio-app.com`, without `/layout-parsing`
   - `TOKEN` - copy the token string

### 2. Configure the Extension

Open Raycast, search "Quick OCR" or "Preview OCR", and enter:

| Setting | Value |
|---------|-------|
| **Access Token** | The `TOKEN` value from step 1 |
| **API URL** | The base URL from `API_URL`, for example `https://xxx.aistudio-app.com` |
