# SnapOCR via Paddle

Chinese version: [README.zh.md](README.zh.md)

SnapOCR brings [Baidu PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)'s document parsing workflow into Raycast.

PaddleOCR positions itself as a toolkit that turns PDF and image documents into structured, AI-friendly data such as Markdown and JSON, with multilingual support for global document workflows. SnapOCR packages that capability into a lightweight desktop workflow for screenshots, PDFs, and images.

This is not a plain text OCR wrapper. SnapOCR uses Paddle's `layout-parsing` API to understand document structure before recognition, then reconstructs headings, paragraphs, tables, formulas, charts, and image regions into reusable Markdown. The output is much closer to the original hierarchy of the page than a flat OCR dump.

## Built for Multilingual, Real-World Documents

SnapOCR should not be read as a tool for one language or one region. The underlying PaddleOCR stack is built for multilingual document understanding, and its document parsing pipeline is meant for complex, real-world pages rather than only clean text screenshots.

That makes SnapOCR suitable for users worldwide who work with:

- multilingual and mixed-language documents
- academic papers, research PDFs, reports, manuals, and forms
- tables, formulas, charts, and dense layout-heavy pages
- screenshots, scans, exported PDFs, and document images

## Why PaddleOCR Fits This Extension

PaddleOCR's own product direction maps directly to SnapOCR's value:

- **Multilingual coverage** - PaddleOCR supports large-scale multilingual recognition, making the workflow practical for global users rather than a single-language niche
- **Complex document parsing** - PP-StructureV3 and related parsing models are designed to improve layout detection, table recognition, formula recognition, chart understanding, and reading-order recovery
- **Structured output** - PaddleOCR is built to convert complex PDFs and document images into structured Markdown- or JSON-style output instead of raw text only
- **API-friendly deployment** - its service-oriented design makes advanced document parsing accessible inside Raycast without local model setup

SnapOCR turns those capabilities into a fast desktop workflow without requiring local OCR models, native dependencies, or command-line tooling.

## What Makes SnapOCR Useful

- **Layout-aware OCR instead of flat OCR** - recognition follows document structure, not just text extraction
- **Multilingual complex-text recognition** - the workflow is designed for users worldwide working across different languages and writing systems
- **Better handling for tables and formulas** - these are first-class parts of the workflow, not side cases
- **Structured Markdown output** - easier to reuse in notes, prompts, knowledge bases, docs, and AI pipelines
- **API-powered headroom** - because SnapOCR is built on PaddleOCR's API, it can grow beyond a simple clipboard OCR tool
- **Practical cost for individuals** - Baidu AIStudio's free PaddleOCR allowance is usually enough for personal day-to-day use

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
