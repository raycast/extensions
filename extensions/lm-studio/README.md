# LM Studio

Use the language and embedding models running in LM Studio directly from Raycast. Chat, transform selected text, manage models, search your own notes, and let Raycast AI delegate a request to a private local model.

> This is an unofficial community integration and is not affiliated with or endorsed by LM Studio or Element Labs.

The LM Studio icon is provided by [Lobe Icons](https://github.com/lobehub/lobe-icons) under the MIT License; see `THIRD_PARTY_NOTICES.md`.

## Requirements

- macOS with [Raycast](https://raycast.com/) installed
- [LM Studio](https://lmstudio.ai/) 0.4.0 or newer
- At least one downloaded language model
- An embedding model only if you want semantic note search

## Setup

1. Open LM Studio and download a language model.
2. Open **Developer** in LM Studio and start the local server.
3. Keep the default server address, `http://localhost:1234`, or enter your server address in the extension preferences.
4. If authentication is enabled in LM Studio, add the server token to the extension's **API Token** preference.
5. Run **Chat with LM Studio** or **Ask LM Studio** in Raycast.

## Commands

### Chat with LM Studio

Create and resume locally saved conversations. The transcript-first chat keeps message content prominent and moves model/performance metadata into **Message Details**. It supports streamed answers, separate reasoning, screenshots and images for vision-capable models, per-conversation generation settings, LM Studio MCP plugins, branching, regeneration, exports, and generation statistics.

### Ask LM Studio

Send a one-off request using typed text, selected text, clipboard content, screenshots, or images. Structured mode accepts a JSON Schema and validates the model's completed response. Assign this command a hotkey in **Raycast Settings → Extensions → LM Studio** for instant access from any app.

For image questions, use a vision-capable model and choose **Send Screenshot or Image…** in Chat, or add the file in **Ask LM Studio**. JPEG, PNG, and WebP files are supported, up to four files and 10 MB each.

### Transform Text

Rewrite, summarize, correct grammar, explain code, translate, or apply a saved custom prompt. Results can be copied or pasted back into the previously focused application.

### Manage Models

Inspect downloaded models and loaded instances, load or unload a model, and start a download using an LM Studio catalog identifier or exact Hugging Face URL. Use **Set as Default Chat Model** on a language model to make it the default for new chats, one-shot questions, text transformations, and the Raycast AI ask tool; existing conversations keep their own model setting.

### Search Notes

Explicitly select local folders containing Markdown or plain-text notes, choose an embedding model, and build a local semantic index. The extension does not monitor folders in the background.

## Raycast AI Tools

Mention `@lm-studio` in Raycast AI to:

- Ask the configured local language model a one-off question.
- Search the local note index and return excerpts with source paths.

Raycast may ask permission before invoking an extension tool. Raycast AI also requires a signed-in Raycast account, even though the model request itself goes to your configured LM Studio server. The local LM Studio server must be running when the tool executes.

## MCP Safety

LM Studio MCP plugins are disabled by default. They must be enabled for an individual conversation with both a plugin ID and an explicit tool allowlist. LM Studio executes allowed tools on the server before Raycast receives their results, so only enable plugins and tools you trust.

## Privacy and Local Data

With the default localhost server, prompts are sent directly from Raycast to LM Studio on the same computer. A custom remote server address sends prompts, attachments, and enabled MCP configuration to that server instead.

Conversation transcripts, copied chat attachments, prompt presets, and note embeddings are stored in Raycast's extension support directory. Indexed source documents remain in their original folders. Use the erase actions in Chat and Search Notes to remove extension-managed data.

No external analytics are collected.

## Troubleshooting

### Could not connect to LM Studio

Confirm that LM Studio 0.4.0 or newer is open and that its local server is running. Verify the server URL and token in Raycast's extension preferences.

### No chat models appear

Download a language model in LM Studio, then use **Refresh Models**. Embedding-only models intentionally do not appear in chat selectors.

### Reasoning uses the entire output budget

Increase the maximum output-token setting or select **Off** when the model reports that reasoning can be disabled.

### Note search is unavailable

Download or load an embedding model, select it in **Search Notes**, add a folder, and build the index.

### An MCP request fails

Enable MCP plugins in LM Studio's server settings, verify the configured plugin ID, and confirm every requested tool is in the conversation's allowlist.
