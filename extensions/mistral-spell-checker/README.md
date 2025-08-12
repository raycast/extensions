# Mistral Spell Checker

This Raycast extension allows you to check and correct spelling and grammar in selected text using Mistral AI.

## Setup

1. **Set your Mistral API key:**
   - Open Raycast and go to the Mistral Spell Checker command.
   - Press `Cmd + ,` to open the command's preferences.
   - Enter your Mistral API key in the `apiKey` field.

## Usage

1. Select the text you want to check and correct.
2. Open Raycast and run the Mistral Spell Checker command.
3. The corrected text will be copied to your clipboard.

## Configuration

You can customize the following settings in the command preferences:

- **API Key**: Your Mistral AI API key (required)
- **AI Model**: The AI model to use for spell checking (default: mistral-medium-latest-flash)
- **API Endpoint**: The API endpoint to use for spell checking (default: https://api.mistral.ai/v1/chat/completions)