# Web Researcher - AI-Powered Web Research for Raycast

Web Researcher is a powerful Raycast extension that brings AI-powered web research directly to your fingertips. It leverages local Ollama models to provide intelligent, grounded answers by searching the web, crawling pages, and extracting relevant content.

## ✨ Features

- **Local AI Powered**: Uses your local Ollama models (like `gemma4:31b-cloud`, `llama3.1`, `mistral`, etc.) for complete privacy and fast responses.
- **Deep Web Research**: Automatically searches the web using DuckDuckGo or your local SearXNG instance.
- **Smart Content Extraction**: Crawls websites and extracts clean, readable content to provide context for the AI.
- **Grounded Answers**: The AI model analyzes the extracted content and provides well-reasoned, cited answers based on real web data.
- **Unified Interface**: A single "Ask Web Researcher" command to chat, research, analyze URLs, and view your history.

## 🚀 Commands

| Command | Description |
| --- | --- |
| **Ask Web Researcher** | Unified interface to chat, research, analyze URLs, and view history. |

## 🛠 Tools

| Tool | Description |
| --- | --- |
| **Web Search** | Search the web and scrape raw page content. Returns deep context for the AI to reason about. |

## ⚙️ Preferences

You can customize the extension through Raycast settings:

| Preference | Description | Default |
| --- | --- | --- |
| **Ollama URL** | URL of your local Ollama server | `http://localhost:11434` |
| **Default Model** | Default Ollama model to use | `gemma4:31b-cloud` |
| **SearXNG URL** | URL of your local SearXNG instance (optional, falls back to DuckDuckGo if empty or unavailable) | `http://localhost:8080` |
| **Max Search Results** | Maximum number of search results to crawl per query | `5` |
| **Max Content Length** | Maximum characters to extract per page | `4000` |

## 📦 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Itsharshitgoat/raycast-web.git
   cd raycast-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and install the extension in Raycast:
   ```bash
   npm run build
   ```
   Or use the development mode:
   ```bash
   npm run dev
   ```

## 🧠 Prerequisites

1. **Ollama**: Ensure you have [Ollama](https://ollama.com/) installed and running locally.
2. **Models**: Pull your preferred model (e.g., `ollama run gemma4:31b-cloud`).
3. *(Optional)* **SearXNG**: Set up a local [SearXNG](https://docs.searxng.org/) instance for privacy-focused meta-search.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
