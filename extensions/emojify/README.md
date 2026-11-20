# Emojify 🎨

A Raycast extension that intelligently adds relevant emojis to your text to make it more expressive and engaging! ✨  
Transform your plain text into vibrant, emoji-enhanced messages that better convey tone and emotion. 🌈

## How To Use

### Raycast AI

If you have Raycast Pro subscription, you can use it without any configuration.

If you want to switch from Custom AI Provider to Raycast AI, simpily remove the API Key field from the extension preferernces.

### Custom AI Providers

Please make sure you have properly configured the API key, base URL, and the model name in the extension settings. More specifically,

- Api Key: the token, of course, you need to use their services.
- Base URL: the endpoint of your AI service provider
- Model name: better configure it if you are **using services other than OpenAI**. It will fallback to gpt-4omini if not specified.

## Features

- 🎯 Contextually adds appropriate emojis to your text
- 🔄 Quick and seamless emoji insertion
- 📝 Works with any text input
- 🎨 Maintains the original meaning while adding visual flair
- 🔍 Query proper emoji with text semantics

## Commands

### Emojify

Enhances your text by adding contextually relevant emojis throughout. ✨

### Append Emoji

Select text in an editable field, then run **Append Emoji**. The command adds up to three relevant emoji at the end, preserves the original words and trailing whitespace, and pastes the result as plain text without opening a preview. If the current app or selected text no longer matches, the command copies the result for you to paste.

The command sends the selected text to the extension's configured AI provider. It uses its own emoji-only prompt. Use HTTPS for a remote custom provider. Plain HTTP is supported for loopback addresses such as `http://127.0.0.1:1234/v1`.

### Emoji Selector

Provides a single, most appropriate emoji that matches the semantics of your input text. 🧐.
