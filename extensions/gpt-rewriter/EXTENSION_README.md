# GPT Rewriter - Raycast Extension

A powerful AI-powered text rewriting and transformation tool for Raycast with customizable prompts and per-command settings.

## ✨ Features

- **Silent Operation**: Most commands work silently - select text, run command, get result
- **Multiple AI Models**: Support for GPT-4o, GPT-3.5 Turbo, Claude, and Gemini via OpenAI and OpenRouter
- **Custom Prompts**: Override prompts for each command individually
- **Per-Command Settings**: Configure different models, temperature, and max tokens for each command
- **Multiple Languages**: Translation support for English, Turkish, Persian, and Spanish
- **Text Transformations**: Rewrite, summarize, convert to bullets, and more

## 🚀 Commands

### Silent Commands (No-View Mode)
- **Rewrite Text**: Improve grammar and clarity while keeping a friendly tone
- **Workplace Rewrite**: Rewrite for Slack/tech chat with startup abbreviations
- **Translate to English**: Translate text to English
- **Translate to Turkish**: Translate text to Turkish
- **Translate to Persian**: Translate text to Persian
- **Translate to Spanish**: Translate text to Spanish
- **Summarize Text**: Create concise summaries of text
- **Convert to Bullets**: Convert text to bullet points
- **Shorten Text**: Make text more concise
- **Add Humor**: Rewrite text with humorous tone
- **Generate Questions**: Create questions from text
- **Suggest Improvements**: Suggest ways to enhance text
- **Expand Ideas**: Expand on ideas in text
- **Generate Title**: Create a title for text
- **Identify Key Points**: Extract main ideas from text
- **Positive Reply**: Generate a positive response
- **Negative Reply**: Generate a negative response

### UI Commands (View Mode)
- **Custom Prompt**: Use custom prompts for text transformation
- **Settings**: Configure API keys and preferences

## ⚙️ Configuration

### Required Settings
- **OpenAI API Key**: Your OpenAI API key for GPT models
- **OpenRouter API Key** (optional): For alternative models like Claude and Gemini

### Global Settings
- **Default Model**: Default AI model to use (dropdown with popular models)
- **Default Temperature**: AI response randomness (0.0 to 1.0)
- **Default Max Tokens**: Maximum response length
- **Custom System Prompt**: Override the default system prompt for all operations

### Per-Command Settings

Each command can have its own individual model that overrides the global default:

#### Rewrite Command
- **Rewrite Command Model**: Specific model for rewrite operations (dropdown)
- **Rewrite Prompt**: Custom prompt for text rewriting

#### Workplace Command
- **Workplace Command Model**: Specific model for workplace operations (dropdown)
- **Workplace Prompt**: Custom prompt for workplace rewriting

#### Summarize Command
- **Summarize Command Model**: Specific model for summarization (dropdown)
- **Summarize Prompt**: Custom prompt for summarization

#### Bullets Command
- **Bullets Command Model**: Specific model for bullet conversion (dropdown)
- **Bullets Prompt**: Custom prompt for bullet points

#### Shorten Command
- **Shorten Command Model**: Specific model for text shortening (dropdown)

#### Humor Command
- **Humor Command Model**: Specific model for adding humor (dropdown)

#### Questions Command
- **Questions Command Model**: Specific model for generating questions (dropdown)

#### Improve Command
- **Improve Command Model**: Specific model for suggesting improvements (dropdown)

#### Expand Command
- **Expand Command Model**: Specific model for expanding ideas (dropdown)

#### Title Command
- **Title Command Model**: Specific model for generating titles (dropdown)

#### Key Points Command
- **Key Points Command Model**: Specific model for identifying key points (dropdown)

#### Positive Reply Command
- **Positive Reply Command Model**: Specific model for positive replies (dropdown)

#### Negative Reply Command
- **Negative Reply Command Model**: Specific model for negative replies (dropdown)

#### Translate Commands
- **Translate Commands Model**: Model for all translation operations (dropdown)

### Automatic API Detection
The extension automatically detects which API to use based on the model name:
- **GPT models** (gpt-5, gpt-5-mini, gpt-4o-mini, gpt-4o, gpt-3.5-turbo) → OpenAI API
- **Other models** (claude, gemini, llama, grok, etc.) → OpenRouter API

## 🎯 Usage

### Silent Commands
1. Select text in any application
2. Open Raycast (`Cmd+Space`)
3. Type the command name (e.g., "Rewrite Text")
4. Press Enter
5. The transformed text is automatically copied to clipboard

### Custom Prompt Command
1. Select text in any application
2. Open Raycast and run "Custom Prompt"
3. Enter your custom prompt in the form
4. Press Enter to process

### Settings
1. Open Raycast and run "Settings"
2. Configure your API keys and preferences
3. Set individual command settings as needed
4. Save your configuration

## 🔧 Development

### Prerequisites
- Node.js 18+ and npm
- Raycast app installed

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure
```
src/
├── lib/
│   └── ai.ts              # AI processing logic
├── rewrite.tsx            # Rewrite command
├── workplace.tsx          # Workplace command
├── translate-*.tsx        # Translation commands
├── summarize.tsx          # Summarize command
├── bullets.tsx            # Bullets command
├── custom.tsx             # Custom prompt command
└── settings.tsx           # Settings command
```

## 🎨 Customization

### Custom Prompts
Use `{text}` as a placeholder for the selected text in custom prompts:

```
Rewrite this text in a professional tone: {text}
```

### Model Selection
Choose from available models:
- **OpenAI**: gpt-5, gpt-5-mini, gpt-4o-mini, gpt-4o, gpt-3.5-turbo
- **Anthropic**: claude-sonnet-4
- **Google**: gemini-2.5-flash
- **Meta**: llama-3.3-70b-instruct (Free)
- **Featherless**: qwerky-72b (Free)
- **DeepSeek**: deepseek-chat-v3 (Free)
- **Z-AI**: glm-4.5-air (Free)
- **X-AI**: grok-4, grok-3-mini

**Note**: GPT-5 and GPT-5-mini models don't support temperature and max_tokens parameters, so these will be automatically excluded when using these models.

### Temperature Settings
- **0.0**: Very focused, consistent responses
- **0.7**: Balanced creativity (default)
- **1.0+**: More creative, varied responses

## 🚨 Troubleshooting

### Common Issues
1. **"No API key configured"**: Set up your API keys in Settings
2. **"No text selected"**: Make sure text is selected before running commands
3. **Translation errors**: Check if the selected text is in a supported language

### API Limits
- Monitor your OpenAI/OpenRouter usage
- Consider using cheaper models for high-volume operations
- Set appropriate max tokens to control costs

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This extension requires active internet connection and valid API keys to function.
