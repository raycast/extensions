# Localmind

Connect to your local Ollama instance directly from Raycast for quick, frictionless answers.

Localmind is designed specifically for **one-off queries** without the overhead of a full chat UI or conversation history. Simply open the extension, inject any prompt snippets, run your local models, and copy the results—perfect for developers, writers, or anyone who wants instant AI feedback right from their command palette.

## Features

- **Blazing Fast Local AI:** Query your local [Ollama](https://ollama.com/) instance without relying on external APIs.
- **Snippet Injection:** Create reusable prompts (Snippets) and inject them easily using `#<snippet-code>` in your queries. Use the real-time "Magical View" to preview exactly what will be sent to the model.
- **Web Search Context:** Include recent results from DuckDuckGo to provide current knowledge and context to models.
- **Reasoning Trace Support:** Full support for thinking models (like DeepSeek) with collapsible, markdown-styled reasoning traces.
- **JSON Mode with Schema Validation:** Force the model output strictly to JSON format, optionally guiding it with your own JSON Schema.
- **Save to Desktop:** Easily save the completed response as a markdown file for future back-reference.

## Getting Started

1. Ensure [Ollama](https://ollama.com/) is installed and running on your machine (default: `http://localhost:11434`).
2. Run any model via Ollama (e.g., `ollama run gemma2`).
3. Open Raycast and start using Localmind. Adjust the default model in your extension preferences.