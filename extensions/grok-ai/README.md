# Grok AI Raycast Extension

![Icon](./assets/icon.png)

**Grok AI** lets you query xAI's Grok API directly from Raycast, offering a seamless way to ask questions, view conversation history, and manage custom models. Boost your productivity with AI-powered insights, all within the Raycast ecosystem.

Props to the ChatGPT Raycast extension team for some of the functions and design choices / UX on here. Built with Grok.

## Features

- **Query Grok**: Send questions to Grok AI and receive responses powered by models like `grok-3-mini-fast-beta`.
- **History**: Browse your recent conversations with Grok, including questions and answers.
- **Models**: View and manage AI models with dynamic fetching from xAI's API.
- **Dynamic Model Discovery**: Automatically fetches available models from xAI's API, ensuring you always have access to the latest models.
- **Text-Only Interaction**: Fully text-based, no image processing required.
- **Streaming Support**: Enable real-time response streaming for faster replies (optional).
- **History Control**: Pause chat history saving for privacy or focus.
- **Keyboard Shortcuts**: Quick access to all features through customizable keyboard shortcuts.

## System Requirements

- macOS 11.0 or later
- Raycast 1.60.0 or later
- Active xAI API key

## Installation

### Option 1: Raycast Store (Recommended)
1. Open Raycast
2. Go to Store
3. Search for "Grok AI"
4. Click Install

### Option 2: Development Installation
```bash
# Clone the repository
git clone https://github.com/andreiciobotar/raycast-grok.git

# Navigate to the extension directory
cd raycast-grok

# Install dependencies
npm install

# Build the extension
npm run build

# Run in development mode
npm run dev
```

## Configuration

1. **Get an API Key**:
   - Sign up at [console.x.ai](https://console.x.ai)
   - Generate an API key in your account settings

2. **Configure the Extension**:
   - Open Raycast Preferences
   - Navigate to Extensions > Grok AI
   - Enter your xAI API key
   - (Optional) Configure additional settings:
     - Enable/disable streaming
     - Set default model
     - Configure history settings

## Keyboard Shortcuts

- `⌘ + Space`: Open Raycast
- `Grok AI`: Search for the extension
- `⌘ + Enter`: Send message
- `⌘ + K`: View history
- `⌘ + M`: Manage models

## Privacy & Data Handling

- All conversations are processed through xAI's secure API
- Local history is stored encrypted on your device
- You can disable history saving at any time
- No data is shared with third parties

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify your API key is correct
   - Check if your xAI account is active
   - Ensure you have sufficient API credits

2. **Extension Not Responding**
   - Restart Raycast
   - Check your internet connection
   - Verify the extension is up to date

3. **Streaming Issues**
   - Disable streaming in settings
   - Check your network connection
   - Try a different model

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
