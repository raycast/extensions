# Text Fillin (Raycast Extension)

A Raycast extension that lets you compose temporary text and paste it into the previously focused app with `Cmd + Enter`.

## Getting Started

1. Install dependencies
   - `npm install`
2. Start development
   - `npm run dev`
3. Run `Text Fillin` from Raycast
4. Type your text and press `Cmd + Enter` to submit

## How It Works

- Type text in a `Form.TextArea`
- Press `Cmd + Enter` to submit
- Raycast closes and the text is pasted into the previously focused app via `Clipboard.paste`

## Features

- **Draft auto-save** — Text you type is automatically saved and restored the next time you open Text Fillin.
- **Submission history** — Browse previously submitted text with `Text Fillin History`. You can re-paste, delete individual entries, or clear all history.
