# AI Translator for Raycast

A powerful AI-powered translation extension for Raycast that allows you to translate text between multiple languages using AI models.

## Features

- Translate text between 14+ languages including English, Chinese, Japanese, Korean, French, German, Spanish, and more
- Powered by AI models for high-quality translations
- Simple and intuitive user interface
- Support for Ollama local AI models
- Customizable language settings

## Requirements

- Raycast installed on your macOS device
- For Ollama support: Ollama installed and running locally

## Installation

1. 1. Open Raycast
2. 2. Search for "AI Translator" in the Raycast Extensions Store
3. 3. Click Install
      Or install manually:

```
git clone https://github.com/fanhefeng/translator-raycast-extension.git
cd translator-raycast-extension
npm install
npm run dev
```

## Usage

1. 1. Open Raycast (default shortcut: ⌘ + Space )
2. 2. Type "Translate" to find the extension
3. 3. Enter the text you want to translate in the text area
4. 4. Select the target language from the dropdown menu
5. 5. Press Enter or click the "Translate" button
6. 6. View the translation result

## Configuration

You can configure the extension in Raycast preferences:

1. 1. Open Raycast
2. 2. Go to Extensions → AI Translator → Preferences

### Available Settings

- Server : Select the AI service provider (currently supports Ollama)
- Model : Specify the AI model to use for translation (default: deepseek-r1:latest)
- API Key : Enter your API key if required by the selected provider

## Supported Languages

- English
- Chinese
- Japanese
- Korean
- French
- German
- Spanish
- Russian
- Italian
- Portuguese
- Arabic
- Hindi
- Thai
- Vietnamese
- Custom (define your own language)

## Development

```
# Install dependencies
npm install

# Start development server
npm run dev

# Build the extension
npm run build

# Lint the code
npm run lint

# Fix lint issues
npm run fix-lint

# Publish the extension
npm run publish
```

## License

MIT

## Author

fhf1121

## Acknowledgements

- Raycast API
- Ollama for local AI model support
