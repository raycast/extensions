# Google Search Extension for Raycast

Google search with autosuggestions is an extension for [Raycast](https://www.raycast.com/).

## Features

- Google search with real-time autosuggestions
- Dedicated Google AI Search Mode command
- Toggle between regular search and AI mode via `Shift+Enter`
- Retain `⌘+Enter` (macOS) / `Ctrl+Enter` (Windows) shortcut for copying URL to clipboard
- Search selected text directly
- Search history management (with deduplication)
- Optional query arguments and fallback-command support
- Clipboard fallback when no text is selected

## Commands

- **Google Search**: Search Google with autosuggestions. By default, `Enter` opens in the browser and `Shift+Enter` searches in AI mode. Press `⌘+Enter` (macOS) / `Ctrl+Enter` (Windows) to copy the URL for the primary action.
- **AI Search Mode**: Search Google directly in AI mode (`udm=50`). Press `Enter` to open in AI mode, `⌘+Enter` (macOS) / `Ctrl+Enter` (Windows) to copy the AI search URL, or `Shift+Enter` to open in standard search.
- **Google Search Selected Text**: Quickly search Google for the currently highlighted text, with optional clipboard fallback.

## Preferences

### Extension Preferences

- **Remember Search History**: Enable/disable storing Google search history locally.

### Command Preferences (Google Search)

- **Return Key Action** chooses between **Open in Browser** and **Search in AI Mode**. Use `Shift+Enter` for the other action. Website suggestions open directly in the browser in either mode.

### Command Preferences (Google Search Selected Text)

- **Use Clipboard Fallback**: When no text is selected, fall back to using clipboard content for search.

## Please note

The extension will fail if you have the "Limit IP Address Tracking" setting enabled in System Preferences > Network.

## Author

**Matthew Blode** (mblode)

- [GitHub](https://www.github.com/mblode)
- [Portfolio](https://matthewblode.com)
