# Open WebUI Web Clipper

Capture browser content from Raycast and send it directly to your self-hosted Open WebUI.

The extension can save a full page, selected text, or just the current URL; create a new chat inside an Open WebUI folder; append material to an existing chat; or save the material as a folder source. Captured content is preserved as a Markdown attachment so the original context remains visible and reusable.

## Features

- Capture selected text, a full web page, or URL + title.
- Create a new Open WebUI chat directly inside a selected folder.
- Append captured material to an existing chat.
- Save captured content as a reusable folder source without creating a chat.
- Attach the complete capture as a Markdown file to the chat message.
- Start the selected model automatically after capture.
- Quick commands for saving the current page or selection with no form.
- Remember the last folder, model, and main form options.
- Choose whether Open WebUI should open after sending: never, only for the main command, or always.

## Requirements

- Raycast on macOS.
- Raycast Browser Extension for full-page capture and browser metadata. Raycast will offer to install it if needed.
- A reachable Open WebUI instance with API keys enabled.
- At least one folder and one available model in Open WebUI.

The extension is built against the Open WebUI 0.11.x API and has been tested with Open WebUI 0.11.1.

## Setup

1. In Open WebUI, create a user API key.
2. Open the extension preferences in Raycast.
3. Set **Open WebUI URL** to the base URL of your instance, for example `https://openwebui.example.com` or `http://127.0.0.1:3000`.
4. Paste the key into **Open WebUI API Key**.
5. Choose the preferred **Open WebUI After Sending** behavior.

The first time you use **Send Web Content**, choose a folder and model. The extension remembers both for subsequent captures and quick-save commands.

## Commands

### Send Web Content

Opens a form where you can choose:

- what to capture: selected text, full page, or URL + title;
- what to do: create a chat, save a folder source, or append to a chat;
- destination folder;
- model for a new chat;
- prompt preset or a custom prompt;
- whether the model should start responding immediately.

### Save Page

Captures the current page, creates a visible chat in the last selected folder, attaches the full Markdown capture, and starts the remembered model immediately.

By default this runs in the background and leaves you on the current web page.

### Save Selection

Works like **Save Page**, but captures only the currently selected text.

## How Captures Are Stored

For chat-based captures, the extension:

1. converts the capture to Markdown;
2. uploads it to Open WebUI;
3. attaches the Markdown file to the user message;
4. adds the same file as a source for the selected folder when possible;
5. starts the requested model response when enabled.

This keeps the source material visible to the user instead of passing it only as hidden model context.

## Privacy

The extension itself sends captured content only to the Open WebUI instance configured in Raycast Preferences. It does not use an intermediary service and contains no external analytics. Open WebUI may in turn send prompts or files to whatever model providers you have configured there.

Your Open WebUI API key is configured as a Raycast password preference and is sent only as a bearer token to the configured Open WebUI base URL.

## Notes

- Full-page capture uses Raycast's Browser Extension Markdown extraction, which behaves similarly to a reader-mode extraction. Some highly dynamic pages may not expose all visible content.
- Open WebUI APIs can change between releases. If a future Open WebUI version changes chat, file, folder, or task endpoints, the extension may need an update.

## Development

```bash
npm install
npm run dev
```

Before publishing:

```bash
npm run lint
npm run build
```
