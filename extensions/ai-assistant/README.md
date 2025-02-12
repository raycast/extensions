# AI Assistant for Raycast

**Apple Intelligence, but for ALL Macs!**

Imagine a personal assistant integrated directly into your Mac, capable of writing, rephrasing, correcting, summarizing and translating your texts in a flash. Have an idea? Dictate it, and it transforms it into clear and precise notes. Need to understand a long article or report? A shortcut, and voilà! It gives you an instant summary.

All of this, without waiting for Apple Intelligence and without needing a latest-generation Mac! Enjoy a smooth, fast, and intuitive AI, accessible to everyone, directly from your keyboard.

🔥 A shortcut, a command, and the AI does the rest. You'll never have to copy-paste into Google Translate or ChatGPT again!

## About the Author
[Alexandre Pezzotta](https://github.com/pezzos) - Engineer passionate about AI and automation. Feel free to check out my other projects on GitHub!

## Features

See the features in action in the [Demo Video](https://youtu.be/TfOwWesfGqw).

🌐 Smart Translation
Are you drafting a message in another language for an international colleague? No need to copy and paste into Google Translate anymore! Simply select the text and trigger the command: your assistant will handle the translation while maintaining the tone and style. Save time and stay fluent in all your communications.
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
Tired of typing? Need to capture an idea on the fly? Speak, and your assistant transforms your voice into accurate and fluid text.
With ultra-high-performance voice recognition, you can dictate your notes, emails, or messages with ease. The AI automatically can automatically translate your text, and even improve it for better readability.
- **Features:**
  - Speech-to-text conversion with high accuracy
  - Support for both online (OpenAI) and local Whisper models
  - Automatic language detection
  - Optional translation to target language
  - Text improvement and cleanup (removing filler words, correcting grammar)
  - Automatic system audio muting during dictation
  - Active application detection for better context
  - Transcription history with metadata
  - Personal dictionary integration
- **Usage:**
  1. Trigger the command "**Dictate Text**" through Raycast
  2. Speak your text (recording stops after 2s of silence)
  3. Wait for processing
  4. Transcribed (and optionally translated) text will be pasted

🤖 Dictate Prompt Everywhere
Your workflow, your rules! Dictate your prompts to guide the AI according to your needs: brainstorming, writing emails, optimizing code… One shortcut, and your assistant will know exactly what to do. No need to write anymore, let your assistant do the work!
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
Too long, no time? Select any web page* or text and run the command to get a clear and concise summary in seconds. Ideal for articles, emails, and reports that you need to digest quickly.
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
**Note:** The Page Summarizer feature is currently limited to web pages publicly accessible.

⚙️ Settings & Configuration
- **Features:**
  - Language preferences (primary/secondary)
  - AI model selection
  - Speech recognition mode (online/local)
  - Whisper model management
  - Personal dictionary management
  - Audio settings (muting during dictation)
  - Feature toggles
- **Usage:**
  - Trigger the command "**Settings**" through Raycast for main settings
  - Trigger the command "**Manage Whisper Models**" through Raycast for local Whisper model management
  - Trigger the command "**Add Word to Dictionary**" through Raycast to add custom word replacements
  - Trigger the command "**Manage Personal Dictionary**" through Raycast to manage your personal dictionary

📖 Personal Dictionary
Customize your dictation experience by adding your own words, names, and phrases to your personal dictionary. Perfect for technical terms, proper nouns, or frequently used expressions that need specific formatting or spelling.
- **Features:**
  - Add custom word replacements
  - Support for technical terms and proper nouns
  - Automatic correction during dictation
  - Case-sensitive replacements
  - Export/Import dictionary
- **Usage:**
  1. Trigger the command "**Add Word to Dictionary**" through Raycast
  2. Enter the word to replace and its replacement
  3. Your personal dictionary will be automatically applied during dictation

📜 Transcription History
Keep track of all your dictations and manage your transcription history efficiently.
- **Features:**
  - View complete transcription history
  - Search through past transcriptions
  - Retranscribe original audio recordings if needed
  - Copy previous transcriptions
  - Automatic cleanup of old recordings
- **Usage:**
  1. Trigger the command "**View Dictation History**" through Raycast
  2. Browse or search through your transcription history
  3. Select an entry to view or use filters to find specific transcriptions
  5. Press Enter to add it to the clipboard and paste it to the active application or use the CMD+K shortcut to use it differently

## Prerequisites

- macOS 12 or later
- Node.js 16 or later
- OpenAI API key
- Sox (for voice recording)
  ```bash
  # Install on macOS
  brew install sox ffmpeg ffprobe
  ```

## Installation

1. Install the extension from the Raycast Store
2. Configure your OpenAI API key in Raycast preferences
3. Select your primary and secondary languages
4. Optional: Install Sox for voice recording features (`brew install sox ffmpeg ffprobe`)

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

#### Detailed Settings Description

##### Language Settings
- **Primary Language**: Your main language for translations and AI interactions
- **Secondary Language**: Your alternate language for translations
- **Default Output Language**: Language used as output after speech recognition if you want an automatic translation (can be set to "Keep the same language as the input")

##### Speech Recognition Settings
- **Whisper Mode**: Choose between online (OpenAI API) or local processing
- **Experimental Single Call Mode**: (Online mode only) Send audio directly to GPT-4o-mini-audio-preview for faster processing instead of using Whisper then the selected model to reduce latency
- **Local Whisper Model**: (Local mode only) Select the local Whisper model to use (Tiny, Base, Small, Medium) to have faster processing (require more disk space and need to be set up manually)

##### AI Model Settings
- **AI Model**: Select the AI model for all operations:
  - GPT-4o: Most capable model
  - GPT-4o Mini: Fastest/Recommended
  - o1: Most powerful reasoning model
  - o1-mini: Smaller reasoning model

##### Recording Settings
- **Silence Timeout**: Number of seconds of silence before stopping recording
- **Mute During Dictation**: Automatically mute system audio output while recording (e.g.: music, notification sounds)

##### Feature Settings
- **Improve Text Quality**: Automatically fix grammar and spelling during translations and text generation
- **Show 'Explore More' in Summaries**: Include additional resources and related topics in page summaries
- **Personal Dictionary**: Apply personal dictionary corrections during speech recognition

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
- Does not store your OpenAI API key or any sensitive data (it's sent directly to OpenAI and stored locally)
- Temporarily stores voice recordings (deleted after 1 hour)
- Only sends necessary data to OpenAI API
- Processes text locally when possible
- Does not track usage or collect analytics
- Is open-source and transparent, if you have any doubts about privacy, the code is available on GitHub

## Contributing

Feel free to submit issues and enhancement requests!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- OpenAI for their amazing APIs
- Raycast team for the excellent extension platform and Raycast I use every day
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for local speech recognition
- All the [contributors](https://github.com/pezzos/raycast-ai-assistant/graphs/contributors)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for all changes and release notes.

## Project Structure

The project is organized into several key directories, each with its own documentation:

- `/src`: Core source code and components
- `/src/utils`: Utility functions and helpers
- `/assets`: Static assets and icons
- `/metadata`: Store and extension metadata

Each directory contains its own README with detailed information about its purpose and contents.

## TODO
- [ ] Improve the translation feature to translate entire pages and non-edittable text
- [ ] Use the text-validator feature to improve the dictate prompt feature
- [ ] Improve performance
- [ ] Fix too long dictation failing if the recorded audio is too large
- [ ] Fix experimental single call mode translating the dictation
- [ ] Set a timeout for the transcription to avoid being blocked by a long transcription
- [ ] Add fancier icons for the new commands
- [ ] Add support for more AI models (Claude, Gemini, etc.)
- [ ] Add support for more languages
- [ ] Improve error handling and recovery
- [ ] Add unit tests and integration tests
- [ ] Improve caching mechanism
- [x] Improve UI to describe the settings in more detail in Raycast preferences with user-friendly descriptions and use cases
- [x] Add README.md in every directories
- [x] Add personal dictionary with custom words and command to add replacement words
