# Obsidian Manager

AI-powered content ingestion and vault management for Obsidian.

## Features

- **Ingest to Obsidian** - Ingest content from URLs, PDFs, EPUBs, and files with AI-generated atomic notes
- **Batch Ingest** - Process multiple sources at once
- **Quick Ingest from Clipboard** - Quickly ingest URL from clipboard
- **Research Query** - Ask research questions and generate expert-level notes
- **Organize Vault** - AI analysis to rename, rewrite, or split notes into atomic format
- **Vault Recommendations** - Find gaps and missing connections in your vault

## Setup

### Required

1. **Obsidian Vault Path** - Set the path to your Obsidian vault in preferences
2. **Gemini API Key** - Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Optional (for YouTube transcription)

To ingest YouTube videos, you need `uv` installed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

If `uv` is not in your PATH, set the full path in extension preferences.
