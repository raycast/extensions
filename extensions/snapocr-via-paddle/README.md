# SnapOCR via Paddle

Chinese version: [README.zh.md](README.zh.md)

SnapOCR brings [Baidu PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)'s document parsing capabilities into Raycast. PaddleOCR is built to turn documents and images into structured, AI-friendly data such as Markdown and JSON, and SnapOCR packages that power into a lightweight workflow for screenshots, PDFs, and images.

This is not a plain OCR wrapper. SnapOCR is built on Paddle's `layout-parsing` API, so it understands page structure before recognition and reconstructs titles, paragraphs, tables, formulas, charts, and image regions into reusable Markdown. The result is much closer to the logic of the original document than a flat text dump.

## Built for Global Document Workflows

PaddleOCR supports large-scale multilingual document processing, and its latest document parsing stack is designed for real-world content rather than simple clean text screenshots. That makes SnapOCR suitable for users worldwide who work with:

- multilingual documents and mixed-language pages
- dense reports, academic PDFs, and long-form documents
- tables, formulas, charts, and other complex layout elements
- screenshots, scanned pages, exported PDFs, and document images

In other words, SnapOCR is not positioned as a Chinese-only OCR tool. It is a multilingual, layout-aware document parser built on top of PaddleOCR's global language and document understanding capabilities.

## Why PaddleOCR

PaddleOCR's own positioning maps directly to what this extension needs:

- **Multilingual support at scale** - PaddleOCR supports 100+ languages across global document processing scenarios
- **Complex element recognition** - the document parsing stack is built to handle text, tables, formulas, charts, and other dense elements
- **Structured output** - PaddleOCR can restore reading order and convert complex PDFs or document images into Markdown or JSON-like structured results
- **Deployment flexibility** - its API and service-oriented design make it practical to bring advanced document parsing into a Raycast extension

SnapOCR takes those strengths and turns them into a fast desktop workflow without local models, native OCR dependencies, or command-line setup.

## What Makes SnapOCR Valuable

- **Layout-aware OCR instead of flat OCR** - the extension understands document structure first and only then performs recognition
- **Complex text recognition for everyone** - users are not limited to one language or one script; the underlying PaddleOCR stack is meant for multilingual usage worldwide
- **Better support for tables and formulas** - those are part of the core use case, not an afterthought
- **Structured Markdown output** - more usable for notes, knowledge bases, prompts, and document workflows
- **API-powered growth path** - because the extension talks to PaddleOCR through API, it can support richer parsing workflows than a local plain-text grabber
- **Practical cost** - Baidu AIStudio's free PaddleOCR allowance is usually enough for individual day-to-day use

## Commands

| Command                 | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Quick OCR**           | Capture a screenshot and instantly copy structured OCR text                   |
| **Preview OCR**         | Capture a screenshot and review structured OCR output in Raycast              |
| **Export OCR Markdown** | Choose a PDF or image file and export a Markdown bundle with extracted images |

## What You Can Do

### 1. Capture Complex Text from Screenshots

Use **Quick OCR** when you want the fastest workflow for turning a screenshot into reusable text.

### 2. Review Rich OCR Output Before Copying

Use **Preview OCR** when you want to inspect the recognized result in Raycast first, especially for complex pages with tables, formulas, or dense document structure.

### 3. Export PDFs and Images as Markdown Bundles

Use **Export OCR Markdown** when you want a real output package:

- a `document.md` file
- extracted image assets saved alongside it
- a cleaner handoff into notes, docs, prompts, or AI workflows

## OCR Capabilities

### Layout-Aware Markdown

Because SnapOCR uses Paddle's layout parsing endpoint, the Markdown output preserves much more structure than a plain OCR pipeline:

- headings stay headings
- paragraphs stay paragraphs
- tables come back in structured form
- formulas are much less likely to collapse into unreadable noise
- extracted images can be saved alongside the Markdown export

### Optional Document Recovery Features

Enable optional features in extension preferences when you need better recovery from messy real-world inputs:

- **Document Orientation Classify** - Automatically detect and correct rotated documents
- **Document Unwarping** - Correct perspective distortion from curved or tilted pages
- **Chart Recognition** - Extract text from charts, tables, and diagram-like content
- **Fast Mode** - Speed up screenshot and image OCR by resizing large images and skipping slower enhancement passes

## Setup

You need a free [Baidu AIStudio](https://aistudio.baidu.com) account to get the API credentials. The OCR service is provided through Baidu AIStudio's PaddleOCR platform.

Baidu AIStudio also offers a free PaddleOCR allowance that is usually enough for personal use. Exact quotas can change, so users should check the official PaddleOCR page for the latest details.

### 1. Get API URL and Access Token

1. Visit [https://aistudio.baidu.com/paddleocr](https://aistudio.baidu.com/paddleocr)
2. Log in with your Baidu account
3. Click the **"API"** button
4. Copy:
   - `API_URL` - the base URL, for example `https://xxx.aistudio-app.com`, without `/layout-parsing`
   - `TOKEN` - the access token string

### 2. Configure the Extension

Open Raycast, search for one of the commands, and enter:

| Setting          | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| **Access Token** | The `TOKEN` value from step 1                                           |
| **API URL**      | The base URL from `API_URL`, for example `https://xxx.aistudio-app.com` |
