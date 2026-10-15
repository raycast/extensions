# Translate Bidirectional AI

Raycast extension that translates the selected (or copied) text with **Raycast AI** — no external API keys and no setup. It detects the language automatically and shows the translation in a native view, preserving the original formatting.

Works on **macOS and Windows** (built on the Raycast 2.0 API).

## How it works

- If the text is **not** in your primary language → it's translated to the **primary** language.
- If the text is **already** in your primary language → it's translated to the **secondary** language.

Defaults are Brazilian Portuguese (primary) ⇄ English (secondary), so any foreign text becomes Portuguese, and Portuguese becomes English. Change these in the preferences.

The result streams live and preserves the source structure as Markdown (headings, lists, tables, code). When you copy rich content first (⌘C/Ctrl+C), the extension reads the clipboard's HTML so layout like tables survives.

## Command

- **Translate** — reads the selected text (or, if there is no selection, the clipboard), translates it with Raycast AI, and shows the result in a view where you can **Paste** or **Copy** it.

## Usage

1. Select some text in any app (or copy it to the clipboard).
2. Run the **Translate** command (binding a hotkey is recommended).
3. Paste or copy the translation from the result view.

## Preferences

- **Primary Language** — text not in this language is translated to it (default: `Brazilian Portuguese (pt-BR)`).
- **Secondary Language** — used when the input is already in the primary language (default: `English`).

## Requirements

- A Raycast plan that includes **AI access** (the command uses Raycast AI).

## Development

```bash
npm install
npm run dev
```

The extension then appears under your local extensions in Raycast while in dev mode.
