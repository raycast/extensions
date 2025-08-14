# GPT Rewriter - Raycast Extension

A powerful AI-powered text rewriting and transformation tool for Raycast, featuring customizable prompts and support for multiple AI providers.

## 🚀 Quick Start

### Installation
1. **Clone this repository**
2. **Run setup**: `./setup.sh`
3. **Start development**: `npm run dev`
4. **Import in Raycast**: Extensions → Import Extension → Select this folder

### Configuration
1. **Open Settings** in the extension
2. **Add API keys**:
   - OpenAI API Key: [Get from OpenAI](https://platform.openai.com/api-keys)
   - OpenRouter API Key: [Get from OpenRouter](https://openrouter.ai/keys)
3. **Choose your preferred AI provider and model**

## 🎯 Features

- **Text Rewriting**: Improve grammar and clarity
- **Workplace Rewriting**: Optimize for Slack/tech chat
- **Translation**: Support for 5 languages (EN, TR, FA, ES)
- **Summarization**: Create concise summaries
- **Bullet Points**: Convert text to organized lists
- **Custom Prompts**: Create your own transformations
- **Multiple AI Providers**: OpenAI and OpenRouter support

## 📁 Project Structure

```
├── src/
│   ├── lib/
│   │   └── ai.ts              # AI processing logic
│   ├── rewrite.tsx            # Text rewriting command
│   ├── workplace.tsx          # Workplace rewriting command
│   ├── translate.tsx          # Translation command
│   ├── summarize.tsx          # Summarization command
│   ├── bullets.tsx            # Bullet points command
│   ├── custom.tsx             # Custom prompts command
│   └── settings.tsx           # Settings command
├── package.json               # Extension configuration
├── tsconfig.json              # TypeScript config
├── setup.sh                   # Development setup script
└── EXTENSION_README.md        # Detailed documentation
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Publish to Raycast store
npm run publish
```

## 📖 Documentation

See [EXTENSION_README.md](EXTENSION_README.md) for comprehensive documentation including:
- Detailed feature descriptions
- User guides
- Troubleshooting
- Contributing guidelines

## 📄 License

MIT License
