# Align RTL

Paste selected text as right-aligned rich RTL content.

Align RTL creates an HTML clipboard payload with `dir="rtl"`, `direction: rtl`, and `text-align: right`, then pastes it into the active application. This helps in rich-text editors that display Hebrew or Arabic text correctly but keep the paragraph aligned to the left.

Unlike a plain Raycast Snippet, Align RTL can paste rich HTML markup so editors such as Mail, Notion, and Slack can preserve paragraph-level right alignment when they accept rich clipboard content. A plain-text Unicode RTL fallback is included for apps that do not accept HTML clipboard data.

## Command

- `Align RTL`: Reads the selected text, or falls back to the clipboard, and pastes it as right-aligned RTL content using a rich HTML clipboard payload.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```
