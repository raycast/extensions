# SnapAsk

SnapAsk is a Raycast extension that provides instant AI answers for quick information retrieval and problem-solving.

## Configuration

To use SnapAsk, you'll need to configure a few settings:

### API Key

1. Open Raycast and go to the SnapAsk extension settings.
2. Enter your API key in the "API Key" field.

For OpenAI:

- Go to https://platform.openai.com/account/api-keys
- Create a new API key
- Copy and paste the key into the SnapAsk settings

For other providers, follow their instructions to obtain an API key.

### Base URL

By default, SnapAsk uses OpenAI's API. If you want to use a different provider:

1. In the SnapAsk settings, find the "Base URL" field.
2. Enter the base URL for your chosen provider's API.

Example for OpenAI: https://api.openai.com/v1/

### LLM Model

You can customize the AI model used by SnapAsk:

1. In the SnapAsk settings, locate the "LLM Model" field.
2. Enter the name of the model you want to use.

Popular models include:

- OpenAI: "gpt-3.5-turbo", "gpt-4"
- Anthropic: "claude-2", "claude-instant-1"

Make sure the model you choose is supported by your API provider.

## Usage

Once configured, you can use SnapAsk by:

1. Opening Raycast
2. Typing "SnapAsk" to find the extension
3. Entering your question or prompt
4. Pressing Enter to get an AI-generated response

## Troubleshooting

If you encounter issues:

1. Double-check your API key and make sure it's entered correctly.
2. Verify that the Base URL is correct for your chosen provider.
3. Ensure the LLM Model you've selected is supported by your provider.
4. Check your internet connection.

For more help, visit the [Raycast Community](https://www.raycast.com/community) or [report an issue](https://github.com/raycast/extensions/issues).
