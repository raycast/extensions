# AlephAlpha

Interact with AlephAlpha Inference API directly from Raycast.

## Features

- **List Models**: View all available AlephAlpha models and their capabilities
- **Summarize**: Quickly summarize any text
- **Improve Writing**: Enhance grammar, clarity, and readability of text
- **Create Custom Chat Prompt**: Fine-tune your prompts with advanced parameters
- **Use Steering**: Guide model outputs using predefined concepts
- **Check Performance**: View performance metrics for different models

## Setup

Before using this extension, you'll need:

1. An AlephAlpha account and API key
2. Access to the AlephAlpha API

### Getting an API Key

1. Create an account at [AlephAlpha](https://app.aleph-alpha.com/)
2. Go to your profile settings
3. Create a new API key
4. Copy the API key to your clipboard

### Configuration

1. Open Raycast and go to the Extension settings
2. Enter your AlephAlpha API Key
3. Enter the AlephAlpha API URL (typically `https://api.aleph-alpha.com/v1`)
4. Set your default model (the extension uses "llama-3.1-8b-instruct" by default)

## Usage

### Summarize Text

1. Use the "Summarize" command
2. Enter or paste the text you want to summarize
3. View and copy the summarized result

### Improve Writing

1. Use the "Improve Writing" command
2. Enter or paste the text you want to improve
3. Get enhanced text with better grammar and readability

### Custom Chat Prompt

For advanced users who want more control:

1. Use the "Create Custom Chat Prompt" command
2. Set your desired model
3. Customize system and user prompts
4. Adjust parameters like temperature, top_p, etc.
5. Submit and view the response

## Models

The extension supports all AlephAlpha models, including:
- Llama-3.1-8b-instruct
- Other models available on your account

## Feedback and Support

If you encounter any issues or have suggestions for improvement, please file an issue on the GitHub repository or contact the developer.

## Privacy

This extension connects directly to the AlephAlpha API using your personal API key. No data is stored by the extension itself - all processing happens on AlephAlpha's servers according to their privacy policy.