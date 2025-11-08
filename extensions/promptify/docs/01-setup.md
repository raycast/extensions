# Setup Guide

This guide will walk you through setting up Promptify from scratch, including all prerequisites and configuration options.

## 📋 Prerequisites

### 1. System Requirements

- **macOS**: 12.0 (Monterey) or later
- **Raycast**: Version 1.50 or later
- **RAM**: 4GB minimum (8GB recommended for larger models)
- **Storage**: 2GB free space (for Ollama models)

### 2. Install Ollama

Promptify uses Ollama for local AI processing, ensuring your data never leaves your machine.

#### Download and Install
1. Visit [ollama.ai](https://ollama.ai/)
2. Download the macOS installer
3. Run the installer and follow the setup wizard
4. Ollama will automatically start as a background service

#### Verify Installation
Open Terminal and run:
```bash
ollama --version
```

You should see version information confirming the installation.

### 3. Download an AI Model

Ollama needs at least one language model to work. We recommend starting with a lightweight model:

```bash
# Recommended: Fast and efficient for most prompts
ollama pull llama3.2:3b

# Alternative: More capable but requires more RAM
ollama pull llama3.1:8b

# Check installed models
ollama list
```

#### Model Recommendations

| Model            | Size    | RAM Required | Best For                                         |
| ---------------- | ------- | ------------ | ------------------------------------------------ |
| `llama3.2:3b`    | \~2GB   | 4GB+         | Quick enhancements, general use                  |
| `deepseek-r1:8b` | \~4.7GB | 8GB+         | Step-by-step reasoning, coding, smarter chat     |
| `gpt-oss:20b`    | \~13GB  | 16GB+        | Complex tasks, creative generation, long context |


## 🛠️ Install Promptify

### Method 1: Raycast Store (Recommended)
1. Open Raycast
2. Search for "Promptify"
3. Click "Install" 
4. Grant necessary permissions when prompted

### Method 2: Development Mode
If you're installing from source:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Thomas-Basadonne/promptify-raycast.git
   cd promptify-raycast
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

4. **Import into Raycast**:
   - Open Raycast preferences
   - Go to Extensions → Developer
   - Click "Add Extension"
   - Select the project folder

## ⚙️ Configuration

### Access Preferences
1. Open Raycast
2. Go to Settings → Extensions
3. Find "Promptify" and click the gear icon

### Core Settings

#### AI Provider
- **Provider**: Ollama (default, recommended)
- **Ollama URL**: `http://localhost:11434` (default)
- **Ollama Model**: Choose from your installed models

#### Behavior Settings
- **Auto Paste**: Automatically paste enhanced prompts (default: disabled)
- **Save to History**: Save all enhanced prompts (default: enabled)
- **History Limit**: Maximum number of saved prompts (default: 100)

### Advanced Configuration

#### Ollama Connection
If Ollama is running on a different port or host:
```
URL: http://localhost:11434  # Default
URL: http://192.168.1.100:11434  # Remote server
```

#### Model Selection
Choose based on your needs:
- **Speed**: `llama3.2:3b`
- **Quality**: `llama3.1:8b` 
- **Balance**: `mistral:7b`

## 🔧 Verification

### Test Your Setup

1. **Start Ollama** (if not running):
   ```bash
   ollama serve
   ```

2. **Test the connection**:
   ```bash
   curl http://localhost:11434/api/version
   ```

3. **Copy test text**:
   Copy this text: "Write a blog post about productivity"

4. **Run Promptify**:
   - Open Raycast
   - Type "Enhance Prompt (General)"
   - Press Enter

You should see an enhanced version of your prompt!

### Common Setup Issues

#### "AI provider is not available"
- Ensure Ollama is running: `ollama serve`
- Check the URL in preferences
- Verify your model is installed: `ollama list`

#### "No text found in clipboard"
- Copy some text before running the command
- Check clipboard permissions in System Preferences

#### Slow performance
- Try a smaller model: `ollama pull llama3.2:3b`
- Close other memory-intensive applications
- Check Activity Monitor for resource usage

## 🎯 Next Steps

Now that Promptify is set up:

1. **Learn the basics**: Read the [Quick Start Guide](02-quick-start.md)
2. **Explore features**: Check out the [User Guide](03-user-guide.md)
3. **Customize presets**: See [Presets Guide](04-presets-guide.md)

## 🔄 Keeping Updated

### Update Ollama
```bash
# Update Ollama itself
brew update && brew upgrade ollama

# Update models
ollama pull llama3.2:3b
```

### Update Promptify
- **Store version**: Raycast will auto-update
- **Development version**: Pull latest from Git and rebuild

---

**Need help?** Check our [Troubleshooting Guide](10-troubleshooting.md) or [open an issue](https://github.com/Thomas-Basadonne/promptify-raycast/issues).
