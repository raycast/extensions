<div align="center">
  <picture>
    <img alt="logo" height="128px" src="assets/extension-icon.png">
  </picture>
  <h1 align="center">Ollama Mind Map Generator for Raycast</h1>
</div>

Transform any text into beautiful, interactive mind maps using local Large Language Models via Ollama. Perfect for visualizing documentation, articles, meeting notes, or any complex text content.

## ✨ Highlights

- 🤖 **Local AI Processing**: Uses Ollama for local LLM inference - your data never leaves your machine
- 🗺️ **Interactive Mind Maps**: Generates HTML files using [markmap.js](https://markmap.js.org/) for dynamic, expandable visualization
- 📋 **Clipboard Integration**: Just copy any text and generate a mind map with a single command
- 📝 **Markdown Export**: Gets you both the interactive HTML and the markdown source for maximum flexibility
- 🔒 **Privacy-Focused**: All processing happens locally on your machine

## 📋 Prerequisites

- [Ollama](https://ollama.ai/) must be installed and running
- At least one Ollama model installed

### Quick Setup

1. Install Ollama:
```bash
brew install ollama
```

2. Start Ollama server:
```bash
ollama serve
```

3. Pull the recommended model:
```bash
ollama pull mistral-openorca
```

## 💫 Recommended Model

While this extension works with any Ollama model, `mistral-openorca` is recommended because:
- Fast response times
- Good at understanding context and structure
- Efficient resource usage

## 🚀 Usage

1. Copy any text you want to visualize
2. Open Raycast
3. Search for "Generate Mind Map"
4. Select your preferred model
5. Your mind map will be generated and saved as an HTML file
   - The file location will be shown
   - The markdown content will be copied to your clipboard
   - You can immediately open it in your browser

## 📊 Output

The extension generates:
- An interactive HTML file using [markmap.js](https://markmap.js.org/)
- Copied markdown content for use in other tools
- Automatic keyword-based filenames

## 🛠️ Configuration

The extension provides two configurable options:
- **Output Directory**: Where to save the generated mind maps (default: `~/Desktop`)
- **Ollama API URL**: URL of your Ollama server (default: `http://localhost:11434`)

## 🤝 Contributing

Found a bug or have a suggestion? Please open an issue or submit a pull request!
