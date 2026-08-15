# Ollama Translate

Translate text in Raycast with models installed in your local Ollama library. Ollama Translate focuses on preserving meaning, tone, idioms, register, formatting, and terminology instead of translating word by word.

## Features

- Translate automatically while typing or manually from the Action Panel.
- Choose a source language or keep automatic language detection enabled.
- Choose and remember the source and target language pair.
- Search and switch between local Ollama chat models.
- Review a translation a second time to catch losses of meaning.
- Translate text selected in another macOS application.
- Reuse, copy, swap, or remove translations from local history.
- Keep translation text on this Mac without accounts, API keys, or analytics.

## Requirements

- Raycast for macOS.
- [Ollama](https://ollama.com/download) installed and running.
- At least one local multilingual chat model.

For example, install a compact multilingual model with:

```sh
ollama pull gemma3:4b
```

Ollama Translate connects to `http://127.0.0.1:11434` by default. The URL can be changed in the extension preferences, but only loopback addresses such as `localhost`, `127.x.x.x`, and `::1` are accepted.

## Commands

### Translate

Type or paste text, then choose the language pair from the menu beside the search field. The **From** section includes **Detect Language**, while the **To** section selects the output language. Both choices are remembered.

The translation appears in the detail panel and is added to local history. Use the Action Panel to copy, review, swap, clear, or translate again.

### Translate Selected Text

Select text in any macOS application and run **Translate Selected Text**. The selected text is loaded directly into the translator.

## Local Models

The extension lists only models available from the local Ollama server. Cloud-tagged and embedding-only models are hidden. By default, the largest available chat model is selected because larger multilingual models generally preserve context and idioms more reliably.

Use **Choose Local Model…** in the Action Panel to change models. The selected model is remembered.

## Shortcuts

| Action               | Shortcut                      |
| -------------------- | ----------------------------- |
| Translate now        | `↵` before a result exists    |
| Copy translation     | `↵` when a result is selected |
| Double-check meaning | `⌘ ⇧ R`                       |
| Swap languages       | `⌘ ⇧ S`                       |
| Paste source text    | `⌘ ⇧ V`                       |
| Clear                | `⌘ ⇧ ⌫`                       |
| Refresh local models | `⌘ R`                         |

## Privacy

Translation requests go directly from the extension to the configured loopback URL. Remote Ollama servers are deliberately blocked. The extension has no analytics, external translation API, account, or API key, and translation history is stored locally by Raycast.

## Development

```sh
npm install
npm run dev
```

Before submitting a change:

```sh
npm run lint
npm run typecheck
npm run build
```
