# Raycast GPT

An extension that can talk with the ChatGPT

## How to Use

1. Get an OpenAI API Key from the [OpenAI website](https://platform.openai.com/account/api-keys).
2. Open the Raycast Settings and select this extension in the Extensions tab. Enter the key you obtained in "OpenAI API Key".

## Settings

You can change the model or other parameters. Please refer to the [API Reference](https://platform.openai.com/docs/api-reference/chat/create) for more details.

### Save messages

Enabling this option will save your chat even if you exit the extension and close the Raycast window. This is useful when you need to temporarily interrupt and resume a conversation.

### IME Fix

There is a bug in Raycast when entering characters with IME. This option is to avoid that issue. When this option is enabled, pressing Enter after entering characters in the SearchBar will no longer do anything (if the top list item is selected). To submit the prompt, you need to select "Submit" below and press Enter. This option is useful for people who use languages such as Japanese, Chinese, and Korean.
