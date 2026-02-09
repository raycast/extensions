# File Recall

Find files on your Mac using natural language and fuzzy memory, powered by an AI agent.

Can't remember a file's exact name or location? Just describe what you remember — the topic, the rough time, the file type, or even a vague detail — and File Recall's AI agent will search your Mac to find it.

## Features

- **Natural Language Search** — Describe files using everyday language (e.g., "that spreadsheet from last month", "the architecture diagram I saved recently")
- **AI Agent with Autonomous Reasoning** — Uses a ReAct-style agent loop that autonomously searches, verifies, and ranks files
- **Content Understanding** — Can grep text files, read file metadata, and even analyze images using multimodal AI
- **macOS Spotlight Integration** — Leverages `mdfind` for fast, system-wide file search
- **Rich Metadata Extraction** — Reads EXIF data, GPS coordinates, document properties, audio/video attributes via `mdls`
- **Interactive Refinement** — Answer follow-up questions to narrow results without starting over
- **Image Previews** — Thumbnails for image files displayed directly in the results

## Setup

This extension requires an **OpenAI-compatible API key** to power its AI agent.

### Required Preferences

| Preference | Description | Default |
|---|---|---|
| **API Key** | Your OpenAI-compatible API key | *(required)* |
| **API Base URL** | Base URL for the API (supports OpenAI, Azure, local models, etc.) | `https://api.openai.com/v1` |
| **Model** | Model name to use | `gpt-4o-mini` |

### Optional Preferences

| Preference | Description | Default |
|---|---|---|
| **Search Directories** | Comma-separated directories to search in. Leave empty to search everywhere. | `~/Documents,~/Desktop,~/Downloads` |
| **Max Results** | Maximum number of search results to display | `20` |

### Getting an API Key

1. **OpenAI**: Sign up at [platform.openai.com](https://platform.openai.com/) and create an API key
2. **Other providers**: Any OpenAI-compatible API works — just set the correct Base URL and model name. Examples:
   - DeepSeek: `https://api.deepseek.com/v1` with model `deepseek-chat`
   - Local models via Ollama: `http://localhost:11434/v1`

### Recommended Models

- **gpt-4o-mini** — Fast and cost-effective, great for most searches
- **gpt-4o** — Better reasoning for complex queries, supports image analysis
- **deepseek-chat** — Good alternative if you prefer DeepSeek

> **Note**: For image analysis (the `analyze_image` tool), the model must support vision/multimodal inputs.

## Usage

1. Open the **Recall File** command in Raycast
2. Type a description of the file you're looking for
3. Press **Enter** to start the AI agent search
4. Browse results, open files, or answer follow-up questions to refine

### Example Queries

- "A PDF report about quarterly revenue"
- "The Python script I wrote for data migration"
- "Screenshots from last week"
- "That Excel file with budget calculations"
- "Log files from the credit-core project"

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Start search / Re-search with updated query |
| `Cmd + R` | Add more clues to refine results |
| `Cmd + S` | Find files similar to the selected one |
| `Cmd + D` | Remove a file from results |
| `Cmd + F` | Filter to only the selected file type |
| `Cmd + C` | Copy file path |
| `Cmd + N` | Start a new search |

## How It Works

File Recall uses an autonomous AI agent (ReAct pattern) that:

1. **Analyzes** your natural language description
2. **Searches** your Mac using macOS Spotlight (`mdfind`) with progressively widening queries
3. **Verifies** results by reading file content (`grep`), extracting metadata (`mdls`), or analyzing images (multimodal AI)
4. **Ranks** files by relevance and presents them with explanations

The agent iterates autonomously — deciding which tools to use, what to search for, and when to stop — rather than following a fixed pipeline.

## Requirements

- **macOS** (uses macOS-specific tools: `mdfind`, `mdls`, `sips`, `grep`)
- **Raycast** 1.93.0 or later
- An OpenAI-compatible API key
