# SnapOCR via Paddle

Chinese version: [README.zh.md](README.zh.md)

SnapOCR turns screenshots, PDFs, and images into structured Markdown inside Raycast with [Baidu PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR). It is built on Paddle's `layout-parsing` API, so it does not stop at plain OCR. The model understands page structure first, then reconstructs titles, paragraphs, tables, formulas, and image regions into something you can actually reuse.

This makes SnapOCR especially strong on the kinds of documents that basic OCR often breaks: handwritten or vertical Chinese text, dense academic pages, mixed-layout reports, tables, and formula-heavy documents. Instead of giving you a flat text dump, it gives you Markdown that is much closer to the original document logic.

## Why It Matters

- **Complex Chinese OCR, not just simple text OCR** - SnapOCR is designed for Chinese-first documents, including handwriting, vertical text, academic layouts, and mixed Chinese-English pages.
- **Tables and formulas are part of the target use case** - Paddle's layout parsing pipeline helps preserve tables, formulas, and other dense regions that plain screenshot OCR usually flattens.
- **API-powered, so the ceiling is much higher** - Because this extension is backed by the Baidu PaddleOCR API rather than a thin local text grabber, it can handle PDFs, exported Markdown bundles, and more complex page structures.
- **Structured Markdown output** - Headings, lists, paragraphs, tables, and images are exported in a form that can be pasted into notes, prompts, docs, or knowledge bases.
- **Practical for individuals** - Baidu AIStudio offers a free PaddleOCR allowance that is usually enough for personal day-to-day use.

## Why PaddleOCR

PaddleOCR is one of the strongest OCR stacks for Chinese and document understanding. Its advantages are exactly what SnapOCR needs:

- **Chinese-first recognition quality** for handwriting, vertical text, and mixed-language pages
- **Layout parsing** to distinguish titles, body text, tables, formulas, and other semantic regions
- **Document enhancement options** such as orientation classification and unwarping
- **API access** that makes advanced OCR features usable inside a lightweight Raycast workflow

SnapOCR brings those strengths into Raycast without requiring local models, native dependencies, or command-line setup.

## Why SnapOCR Is Different in Raycast

Most OCR-style workflows in Raycast focus on extracting plain text from screenshots. SnapOCR takes a different position: it is built for complex documents and layout-aware Markdown reconstruction.

That means:

- a dense Chinese thesis page is a supported scenario, not an edge case
- complex tables and formulas are part of the core value proposition
- the extension can grow beyond screenshot OCR because the API already supports richer parsing workflows

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

Use **Preview OCR** when you want to inspect the recognized result in Raycast first, especially for complex pages with formulas or structured content.

### 3. Export PDFs and Images as Markdown Bundles

Use **Export OCR Markdown** when you want a real output package:

- a `document.md` file
- extracted image assets saved alongside it
- a cleaner handoff into notes, docs, prompts, or knowledge systems

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
