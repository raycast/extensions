# AI Assistant for Raycast

A powerful collection of AI-powered tools to enhance your productivity, featuring smart translation, voice dictation, text improvement, and page summarization capabilities.

## About the Author
[Alexandre Pezzotta](https://github.com/pezzos) - Engineer passionate about AI and automation. Feel free to check out my other projects on GitHub!

## Features

🌐 Smart Translation
- **Features:**
  - Automatic language detection between primary and secondary languages
  - Preserves formatting, punctuation, and technical terms
  - Optional grammar and spelling correction
  - Caches translations for faster repeated use
  - Supports all major languages
- **Usage:**
  1. Select editable text in any application
  2. Trigger the command "**Translate Selected Text**" through Raycast
  3. Text will be automatically translated and replaced

🎙️ Voice Dictation
- **Features:**
  - Speech-to-text conversion with high accuracy
  - Support for both online (OpenAI) and local Whisper models
  - Automatic language detection
  - Optional translation to target language
  - Text improvement and cleanup
- **Usage:**
  1. Trigger the command "**Dictate Text**" through Raycast
  2. Speak your text (recording stops after 2s of silence)
  3. Wait for processing
  4. Transcribed (and optionally translated) text will be pasted

🤖 Dictate Prompt Everywhere
- **Features:**
  - Dictate a prompt to generate or improve content. E.g.:
    - Dictate "Generate a 100-word essay on the benefits of AI"
    - Respond to John's email with a friendly tone, explain him I can't make it to the meeting because I'm working on an AI assistant for Raycast
    - Improve this email to sound more professional but still friendly
    - ...
  - Supports multiple languages
- **Usage:**
  1. Select editable text in any application or place the cursor where you want the result to be inserted
  2. Trigger the command "**Dictate AI Prompt**" through Raycast, then dictate your prompt
  3. Wait for processing
  4. Result will be inserted into the selected text

📄 Page Summarizer
- **Features:**
  - Extracts main content from web pages
  - Generates concise summaries
  - Highlights key points
  - Optional "Explore More" suggestions
  - Multi-language support
- **Usage:**
  1. Open a web page in your browser or select a text anywhere
  2. Trigger the command "**Summarize A Text or the Current Page**" through Raycast
  3. View the summary in Raycast

⚙️ Settings & Configuration
- **Features:**
  - Language preferences (primary/secondary)
  - AI model selection
  - Speech recognition mode (online/local)
  - Whisper model management
  - Feature toggles
- **Usage:**
  - Trigger the command "**Settings**" through Raycast for main settings
  - Trigger the command "**Manage Whisper Models**" through Raycast for local Whisper model management


## Prerequisites

- macOS 12 or later
- Node.js 16 or later
- OpenAI API key
- Sox (for voice recording)
  ```bash
  # Install on macOS
  brew install sox
  ```

## Installation

1. Install the extension from the Raycast Store
2. Configure your OpenAI API key in Raycast preferences
3. Select your primary and secondary languages
4. Optional: Install Sox for voice recording features (`brew install sox`)

## Configuration

### Required Permissions
- Accessibility permissions for text selection and replacement
- Microphone access for voice recording
- AppleScript permissions for browser integration

### Settings
1. Open Raycast Settings
2. Navigate to Extensions > AI Assistant
3. Configure:
   - OpenAI API Key
   - Primary/Secondary languages
   - AI model preferences
   - Speech recognition mode
   - Optional features

## Usage Tips
- Use keyboard shortcuts in Raycast for quick access
- Combine commands for maximum productivity
- Configure language settings in Raycast preferences
- Check the logs for troubleshooting
- Use local Whisper models for offline speech recognition
- Cache frequently used translations for better performance

## Support

If you encounter any issues or have questions:
1. Check the [Troubleshooting Guide](#troubleshooting) below
2. Open an issue on [GitHub](https://github.com/pezzos/raycast-ai-assistant)
3. Contact me on [LinkedIn](https://www.linkedin.com/in/alexandrepezzotta/)

## Troubleshooting

### Voice Recording Issues
- Ensure Sox is installed: `brew install sox`
- Grant microphone permissions to Raycast
- Check if your microphone is working in System Settings

### Translation/AI Issues
- Verify your OpenAI API key is valid
- Check your internet connection
- Ensure the text is properly selected
- Try switching between online/offline modes

### Browser Integration Issues
- Grant AppleScript permissions to Raycast
- Make sure your browser is supported
- Check if the browser is running

## Privacy

This extension:
- Does not store your OpenAI API key or any sensitive data
- Temporarily stores voice recordings (deleted after 1 hour)
- Only sends necessary data to OpenAI API
- Processes text locally when possible
- Does not track usage or collect analytics

## Contributing

Feel free to submit issues and enhancement requests!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Credits

- OpenAI for their amazing APIs
- Raycast team for the excellent extension platform
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for local speech recognition
- All the [contributors](https://github.com/pezzos/raycast-ai-assistant/graphs/contributors)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for all changes and release notes.

## TODO
- [ ] Add support for more AI models (Claude, Gemini, etc.)
- [ ] Improve UI
- [ ] Add support for more languages
- [ ] Improve error handling and recovery
- [ ] Add unit tests and integration tests
- [ ] Improve caching mechanism
